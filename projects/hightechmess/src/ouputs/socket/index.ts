import WebSocket from 'ws';
import type { Project, Clock } from "@lstudio/core";
import type { State } from "../../state";
import type { ClockPayload } from "../../clock";

import { setColorPalette } from './commands/setColorPallete';
import { setLedColors } from './commands/setLedColors';
import { setLedBrightness } from './commands/setLedBrightness';

type SocketOutputConstructorArgs = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  project: Project<ClockPayload, State, any>,
  clock: Clock<ClockPayload>,
  url: string,
  stripIndex: number,
  subscribeToClock?: boolean,
}

export class OctaCoreOutput {
  private ws: WebSocket | null = null;
  private reconnectTimer?: NodeJS.Timeout;
  private heartbeatTimer?: NodeJS.Timeout;
  private awaitingPong = false;
  private closed = false;
  private unsubscribe?: () => void;
  private lastPalette?: Buffer;
  private lastLeds?: Buffer;
  private lastBrightness?: Buffer;
  private markAsReady: () => void = () => {};
  readonly waitToGetReady: Promise<void>;

  constructor(private readonly options: SocketOutputConstructorArgs) {
    this.waitToGetReady = new Promise(resolve => this.markAsReady = resolve);
    if (options.subscribeToClock !== false) {
      this.unsubscribe = options.clock.subscribe(data => {
        options.project.tick(data);
        this.render(options.project.state);
      });
    }
    this.connect();
  }

  private scheduleReconnect() {
    if (!this.closed && !this.reconnectTimer) {
      this.reconnectTimer = setTimeout(() => {
        this.reconnectTimer = undefined;
        this.connect();
      }, 3000);
    }
  }

  private connect() {
    if (this.closed) return;
    let ws: WebSocket;
    try {
      ws = new WebSocket(this.options.url, { handshakeTimeout: 5000 });
    } catch {
      this.scheduleReconnect();
      return;
    }
    this.ws = ws;
    ws.on('open', () => {
      this.awaitingPong = false;
      this.heartbeatTimer = setInterval(() => this.checkHeartbeat(), 10000);
      // A rebooted board has lost all state, even if the animation is unchanged.
      this.lastPalette = this.lastLeds = this.lastBrightness = undefined;
      this.render(this.options.project.state);
      this.markAsReady();
      console.log(`[Socket] Connected to ${this.options.url} ✅`);
    });
    ws.on('error', error => {
      console.error(`[Socket] ${error.message} ❌`);
    });
    ws.on('pong', () => { this.awaitingPong = false; });
    ws.on('close', () => {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
      console.log(`[Socket] Disconnected from ${this.options.url} ❌`);
      this.scheduleReconnect();
    });
  }

  private checkHeartbeat() {
    if (this.ws?.readyState !== WebSocket.OPEN) return;
    if (this.awaitingPong) {
      this.ws.terminate();
      return;
    }
    this.awaitingPong = true;
    this.ws.ping();
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    clearTimeout(this.reconnectTimer);
    clearInterval(this.heartbeatTimer);
    this.unsubscribe?.();
    this.ws?.terminate();
  }

  render(state: State): void {
    if (this.ws?.readyState !== WebSocket.OPEN) return;
    const strip = state.strips[this.options.stripIndex];
    const palette = setColorPalette(state.palette);
    const leds = setLedColors(strip.leds.map(led => {
      const index = state.palette.indexOf(led);
      if (index === -1) throw new Error(`Color ${led.toString()} not found in palette`);
      return index;
    }));
    const brightness = setLedBrightness(strip.brightness);

    const paletteChanged = !this.lastPalette?.equals(palette);
    if (paletteChanged) {
      this.ws.send(palette);
      this.lastPalette = palette;
    }
    // Restore brightness before pixels so a reboot cannot display at a stale level.
    if (!this.lastBrightness?.equals(brightness)) {
      this.ws.send(brightness);
      this.lastBrightness = brightness;
    }
    if (paletteChanged || !this.lastLeds?.equals(leds)) {
      this.ws.send(leds);
      this.lastLeds = leds;
    }
  }
}
