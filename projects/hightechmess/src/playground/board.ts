import WebSocket from 'ws';
import { performance } from 'perf_hooks';
import { promises as dns } from 'dns';
import { isIP } from 'net';
import { TowerId } from '../config';

export type Role = 'left' | 'right' | 'tower-3' | 'tower-4';
export interface BoardState {
  id: TowerId;
  role: Role;
  connected: boolean;
  compatible: boolean;
  stopPending?: boolean;
  activeRevision?: number;
  rttMs?: number;
  error?: string;
}

type Pending = { resolve: (packet: Buffer) => void; reject: (error: Error) => void };

export class IPv4Resolver {
  private pending = new Map<string, Promise<string>>();
  private cache = new Map<string, { address: string; expiresAt: number }>();

  constructor(
    private readonly lookup: (hostname: string) => Promise<string> = hostname => dns.lookup(hostname, { family: 4 }).then(result => result.address),
    private readonly now: () => number = Date.now,
  ) {}

  resolve(hostname: string): Promise<string> {
    if (isIP(hostname) === 4) return Promise.resolve(hostname);
    const cached = this.cache.get(hostname);
    if (cached && cached.expiresAt > this.now()) return Promise.resolve(cached.address);
    const pending = this.pending.get(hostname);
    if (pending) return pending;
    // OS lookups cannot be cancelled by a WebSocket handshake timeout. Share
    // pending work instead of accumulating another native lookup on every retry.
    const request = this.lookup(hostname).then(address => {
      if (isIP(address) !== 4) throw new Error('An IPv4 address is required');
      this.cache.set(hostname, { address, expiresAt: this.now() + 30000 });
      return address;
    }).finally(() => { this.pending.delete(hostname); });
    this.pending.set(hostname, request);
    return request;
  }

  invalidate(hostname: string) { this.cache.delete(hostname); }
}

const resolver = new IPv4Resolver();

export class BoardConnection {
  readonly state: BoardState;
  readonly role: Role;
  generation = 0;
  private urlIndex = 0;
  private ws?: WebSocket;
  private closed = false;
  private reconnectTimer?: NodeJS.Timeout;
  private heartbeatTimer?: NodeJS.Timeout;
  private awaitingPong = false;
  private pending = new Map<string, Pending>();
  private token = 0;
  private confirmingStop = false;
  private resolving = false;

  constructor(
    readonly id: TowerId,
    private readonly urls: string[],
    readonly timeoutMs = 1000,
    private readonly onHello: (board: BoardConnection) => void = () => {},
    private readonly onDisconnect: (board: BoardConnection) => void = () => {},
    private readonly addressResolver = resolver,
  ) {
    this.role = id === 1 ? 'left' : id === 2 ? 'right' : id === 3 ? 'tower-3' : 'tower-4';
    this.state = { id, role: this.role, connected: false, compatible: false };
    this.connect();
  }

  private async connect() {
    if (this.closed || this.resolving) return;
    const url = this.urls[this.urlIndex];
    const hostname = new URL(url).hostname;
    let address: string;
    this.resolving = true;
    this.state.error = `Tower ${this.id}: resolving address`;
    try { address = await this.addressResolver.resolve(hostname); }
    catch {
      if (!this.closed) {
        this.state.error = `Tower ${this.id}: address resolution failed`;
        this.reconnect();
      }
      return;
    } finally { this.resolving = false; }
    if (this.closed) return;
    // These ESP32 targets use IPv4; avoid waiting for unavailable mDNS AAAA records.
    const ws = new WebSocket(url, {
      family: 4, handshakeTimeout: 3000, maxPayload: 128,
      lookup: (_hostname, _options, callback) => callback(null, address, 4),
    });
    this.ws = ws;
    ws.on('message', (data, binary) => {
      if (!binary || !Buffer.isBuffer(data)) return;
      let key = '';
      if (data.length === 7 && data[0] === 37) key = 'hello';
      if (data.length === 9 && data[0] === 35) key = `clock:${data.readUInt32LE(1)}`;
      if (data.length === 6 && data[0] === 38 && data[5] <= 1) key = `ack:${data.readUInt32LE(1)}:${data[5]}`;
      if (data.length === 5 && data[0] === 41) key = `tempo:${data.readUInt32LE(1)}`;
      if (data.length === 6 && data[0] === 45 && data[5] <= 1) key = `blackout:${data.readUInt32LE(1)}:${data[5]}`;
      this.pending.get(key)?.resolve(data);
    });
    ws.on('open', () => {
      this.generation++;
      this.state.connected = true;
      this.state.compatible = false;
      this.awaitingPong = false;
      this.heartbeatTimer = setInterval(() => {
        if (this.awaitingPong) ws.terminate();
        else { this.awaitingPong = true; ws.ping(); }
      }, 5000);
      this.request('hello', Buffer.from([36])).then(packet => {
        if (packet[1] !== 2 || packet[2] !== this.id - 1) {
          this.state.error = `Tower ${this.id}: firmware version or tower identity mismatch`;
          if (this.urls.length > 1) ws.terminate();
          return;
        }
        this.state.compatible = true;
        this.state.activeRevision = packet.readUInt32LE(3);
        delete this.state.error;
        this.onHello(this);
        if (this.state.stopPending && !this.confirmingStop) this.confirmStop();
      }).catch(() => {
        this.state.error = `Tower ${this.id}: playground firmware required or board did not answer`;
        if (this.urls.length > 1) ws.terminate();
      });
    });
    ws.on('pong', () => { this.awaitingPong = false; });
    ws.on('error', () => {
      this.addressResolver.invalidate(hostname);
      this.state.error = `Tower ${this.id}: connection failed`;
    });
    ws.on('close', () => {
      clearInterval(this.heartbeatTimer);
      const wasCompatible = this.state.compatible;
      this.state.connected = this.state.compatible = false;
      this.state.error = `Tower ${this.id}: disconnected`;
      this.rejectPending(new Error(`Tower ${this.id}: disconnected`));
      if (wasCompatible) this.onDisconnect(this);
      this.reconnect();
    });
  }

  private reconnect() {
    if (this.closed) return;
    this.urlIndex = (this.urlIndex + 1) % this.urls.length;
    this.reconnectTimer = setTimeout(() => this.connect(), 3000);
  }

  request(key: string, packet: Buffer, signal?: AbortSignal): Promise<Buffer> {
    if (signal?.aborted) return Promise.reject(new Error('Play cancelled'));
    if (this.ws?.readyState !== WebSocket.OPEN) return Promise.reject(new Error(`Tower ${this.id}: disconnected`));
    return new Promise((resolve, reject) => {
      let settled = false;
      const finish = (error?: Error, reply?: Buffer) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        signal?.removeEventListener('abort', abort);
        this.pending.delete(key);
        if (error) reject(error);
        else resolve(reply as Buffer);
      };
      const abort = () => finish(new Error('Play cancelled'));
      const timer = setTimeout(() => finish(new Error(`Tower ${this.id}: timed out waiting for ${key.split(':')[0]}`)), this.timeoutMs);
      this.pending.set(key, { resolve: reply => finish(undefined, reply), reject: error => finish(error) });
      signal?.addEventListener('abort', abort, { once: true });
      this.ws?.send(packet, error => { if (error) finish(new Error(`Tower ${this.id}: send failed`)); });
    });
  }

  async clockSample(signal: AbortSignal): Promise<{ offset: number; rtt: number }> {
    this.token = (this.token + 1) >>> 0;
    const packet = Buffer.alloc(5);
    packet[0] = 34;
    packet.writeUInt32LE(this.token, 1);
    const sent = performance.now();
    const reply = await this.request(`clock:${this.token}`, packet, signal);
    const received = performance.now();
    return { offset: reply.readUInt32LE(5) - (sent + received) / 2, rtt: received - sent };
  }

  stop() {
    this.state.stopPending = true;
    this.state.error = `Tower ${this.id}: blackout not yet confirmed`;
    this.confirmStop();
  }

  private async confirmStop() {
    if (this.ws?.readyState !== WebSocket.OPEN || !this.state.compatible) return;
    this.ws.send(Buffer.from([39]), () => {});
    if (this.confirmingStop) return;
    this.confirmingStop = true;
    try {
      // TCP orders this HELLO after STOP, confirming both active and pending work
      // were cleared by the preceding STOP, not merely that activation is future.
      const reply = await this.request('hello', Buffer.from([36]));
      if (reply[1] !== 2 || reply[2] !== this.id - 1 || reply.readUInt32LE(3) !== 0) {
        throw new Error('Blackout not confirmed');
      }
      this.state.activeRevision = 0;
      this.state.stopPending = false;
      delete this.state.error;
    } catch {
      this.state.error = `Tower ${this.id}: blackout not confirmed; reconnect or press Stop again`;
    } finally {
      this.confirmingStop = false;
    }
  }

  private rejectPending(error: Error) {
    [...this.pending.values()].forEach(request => request.reject(error));
  }

  close() {
    this.closed = true;
    clearInterval(this.heartbeatTimer);
    clearTimeout(this.reconnectTimer);
    this.rejectPending(new Error('Controller closed'));
    this.ws?.terminate();
  }
}
