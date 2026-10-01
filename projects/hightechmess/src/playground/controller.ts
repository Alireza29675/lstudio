import { randomBytes, randomUUID } from 'crypto';
import { performance } from 'perf_hooks';
import { BoardConnection } from './board';
import { TowerEndpoint, TowerId } from '../config';
import { defaultProgram, encodeCommit, encodeStage, encodeTempo, Program, validateProgram } from './program';

export class ApiError extends Error {
  constructor(message: string, readonly status = 400) { super(message); }
}

type DraftSource = 'initial' | 'browser' | 'midi' | 'tap';
type ClockSample = { offset: number; rtt: number; sampledAt: number };

export class PlaygroundController {
  readonly sessionId = randomUUID();
  readonly boards: BoardConnection[];
  private program = validateProgram(defaultProgram);
  private draftVersion = 1;
  private draftSource: DraftSource = 'initial';
  private playing = false;
  private participants = new Set<BoardConnection>();
  private tempoAcks = new Map<BoardConnection, number>();
  private blackoutAcks = new Map<BoardConnection, number>();
  private originMs: number | null = null;
  private activeRevision: number | null = null;
  private revision = randomBytes(4).readUInt32LE(0);
  private inFlight?: AbortController;
  private error?: string;
  private taps: number[] = [];
  private midiConnected: () => boolean = () => false;
  private stopVersion = 0;
  private closed = false;
  private tempo = { bpm: defaultProgram.bpm, anchorMs: performance.now(), offsetMs: 0, revision: 1 };
  private tempoSyncedRevision = 0;
  private tempoError?: string;
  private tempoRequested = false;
  private tempoWorker?: Promise<void>;
  private tempoAbort?: AbortController;
  private clocks = new Map<BoardConnection, ClockSample>();
  private browserHolds = new Map<string, { sequence: number; held: boolean; updatedAt: number }>();
  private midiHeld = false;
  private blackoutHeld = false;
  private blackoutRevision = 0;
  private blackoutSyncedRevision = -1;
  private blackoutError?: string;
  private blackoutTask?: Promise<void>;
  private syncListeners = new Set<() => void>();

  constructor(addresses: string[] | TowerEndpoint[], private readonly timeoutMs = 1000) {
    if (!addresses.length || addresses.length > 4) throw new Error('One to four tower endpoints are required');
    const endpoints = addresses.map((entry, i): TowerEndpoint => typeof entry === 'string'
      ? { id: (i + 1) as TowerId, urls: [entry] } : entry);
    if (new Set(endpoints.map(endpoint => endpoint.id)).size !== endpoints.length ||
      endpoints.some(endpoint => ![1, 2, 3, 4].includes(endpoint.id) || !endpoint.urls.length)) throw new Error('Tower identities must be unique numbers from 1 to 4');
    this.boards = endpoints.map(endpoint => new BoardConnection(endpoint.id, endpoint.urls, timeoutMs, board => {
      const retained = this.participants.has(board) && board.state.activeRevision === this.activeRevision;
      if (!retained || board.state.stopPending) {
        this.participants.delete(board);
        // Also cancels inherited future commits that HELLO cannot expose. A new
        // optional arrival never stops or joins another tower's running program.
        board.stop();
        if (!this.participants.size) {
          this.playing = false;
          this.originMs = this.activeRevision = null;
        }
      }
      this.invalidateTempo(board);
      this.blackoutAcks.delete(board);
      this.syncBlackout();
    }, board => {
      this.invalidateTempo(board);
      this.blackoutAcks.delete(board);
      this.syncBlackout();
    }));
  }

  private onlineBoards() {
    return this.boards.filter(board => board.state.connected && board.state.compatible);
  }

  private tempoReady(boards = this.onlineBoards()) {
    return boards.length > 0 && boards.every(board => board.state.connected && board.state.compatible && this.tempoAcks.get(board) === this.tempo.revision);
  }

  private blackoutReady(boards = this.onlineBoards()) {
    return boards.length > 0 && boards.every(board => board.state.connected && board.state.compatible && this.blackoutAcks.get(board) === this.blackoutRevision);
  }

  getState() {
    return {
      sessionId: this.sessionId,
      program: validateProgram(this.program), draftVersion: this.draftVersion, draftSource: this.draftSource,
      playing: this.playing, originMs: this.originMs, nowMs: performance.now(),
      activeRevision: this.activeRevision, busy: !!this.inFlight,
      devices: this.boards.map(board => ({ ...board.state,
        participating: this.participants.has(board), needsSend: !this.participants.has(board),
      })),
      participantIds: [...this.participants].map(board => board.id),
      midi: { connected: this.midiConnected() }, ...(this.error ? { error: this.error } : {}),
      tempo: {
        ...this.tempo, tapCount: this.taps.length, syncing: !!this.tempoWorker,
        synced: this.tempoReady(),
        ...(this.tempoError ? { error: this.tempoError } : {}),
      },
      blackout: {
        held: this.blackoutHeld, revision: this.blackoutRevision,
        synced: this.blackoutReady(),
        ...(this.blackoutError ? { error: this.blackoutError } : {}),
      },
    };
  }

  setMidiStatus(getConnected: () => boolean) { this.midiConnected = getConnected; }
  getStopVersion() { return this.stopVersion; }
  reportError(error: unknown) { this.error = error instanceof Error ? error.message : 'Controller action failed'; }

  updateBlackout(value: unknown) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ApiError('Expected blackout hold settings');
    const input = value as Record<string, unknown>;
    if (Object.keys(input).length !== 3 || Object.keys(input).some(key => !['held', 'clientId', 'sequence'].includes(key)) ||
      typeof input.held !== 'boolean' || typeof input.clientId !== 'string' || !input.clientId.length || input.clientId.length > 100 ||
      typeof input.sequence !== 'number' || !Number.isSafeInteger(input.sequence) || input.sequence < 0) throw new ApiError('Use held, clientId and a nonnegative integer sequence');
    const previous = this.browserHolds.get(input.clientId);
    if (previous && input.sequence <= previous.sequence) {
      if (input.sequence === previous.sequence && input.held === previous.held) this.refreshBlackout(true);
      return this.getState();
    }
    const now = performance.now();
    if (!previous && this.browserHolds.size >= 16) {
      // Keep recent release tombstones beyond the HTTP request timeout so late
      // presses cannot undo releases; never expire an actively held source.
      for (const [id, client] of this.browserHolds) {
        if (!client.held && now - client.updatedAt > 30000) this.browserHolds.delete(id);
      }
      if (this.browserHolds.size >= 16) throw new ApiError('Too many active or recent blackout tabs; release unused tabs and retry after 30 seconds', 429);
    }
    this.browserHolds.set(input.clientId, { held: input.held, sequence: input.sequence, updatedAt: now });
    this.refreshBlackout(true);
    return this.getState();
  }

  setMidiBlackout(held: boolean) {
    if (held === this.midiHeld) return;
    this.midiHeld = held;
    this.refreshBlackout();
  }

  private refreshBlackout(retry = false) {
    const held = this.midiHeld || [...this.browserHolds.values()].some(client => client.held);
    if (held !== this.blackoutHeld) {
      this.blackoutHeld = held;
      this.syncBlackout();
    } else if (retry && this.blackoutSyncedRevision !== this.blackoutRevision) this.syncBlackout();
  }

  private syncBlackout() {
    if (this.closed) return;
    const revision = this.blackoutRevision = (this.blackoutRevision + 1) >>> 0 || 1;
    const held = this.blackoutHeld;
    const packet = Buffer.alloc(6);
    packet[0] = 44; packet.writeUInt32LE(revision, 1); packet[5] = held ? 1 : 0;
    delete this.blackoutError;
    // Each edge sends immediately. In particular, release does not queue behind
    // the press acknowledgement or any tempo/program transaction.
    const task = Promise.all(this.onlineBoards().map(async board => {
      const generation = board.generation;
      await board.request(`blackout:${revision}:${packet[5]}`, packet);
      if (generation === board.generation && board.state.compatible && revision === this.blackoutRevision) this.blackoutAcks.set(board, revision);
      this.notifySync();
    })).then(() => {
      if (revision === this.blackoutRevision) this.blackoutSyncedRevision = revision;
    }).catch(error => {
      if (revision === this.blackoutRevision) this.blackoutError = (error as Error).message;
    }).finally(() => { if (this.blackoutTask === task) this.blackoutTask = undefined; });
    this.blackoutTask = task;
  }

  private async awaitBlackout(signal: AbortSignal, boards: BoardConnection[]) {
    if (this.blackoutReady(boards)) return;
    if (!this.blackoutTask && this.blackoutSyncedRevision !== this.blackoutRevision) this.syncBlackout();
    while (this.blackoutTask && !this.blackoutReady(boards)) {
      await this.awaitTask(this.blackoutTask, signal, () => this.blackoutReady(boards));
    }
    if (!this.blackoutReady(boards)) throw new Error(this.blackoutError ?? 'Blackout state is not synchronized');
  }

  updateDraft(value: unknown, source: DraftSource = 'browser') {
    const program = validateProgram(value);
    program.bpm = this.tempo.bpm;
    if (JSON.stringify(program) !== JSON.stringify(this.program)) {
      this.program = program;
      this.draftVersion++;
      this.draftSource = source;
    }
    return this.getState();
  }

  tap(now = performance.now()) {
    const received = performance.now();
    if (!Number.isFinite(now) || now < received - 3000 || now > received + 100) throw new ApiError('Tap timestamp must be recent host monotonic time');
    const last = this.taps[this.taps.length - 1];
    if (last !== undefined && now <= last) throw new ApiError('Tap timestamps must increase');
    if (last === undefined || now - last > 2000) this.taps = [];
    this.taps.push(now);
    this.taps = this.taps.slice(-4);
    if (this.taps.length === 4) {
      const interval = (now - this.taps[0]) / 3;
      const bpm = Math.round(Math.max(40, Math.min(240, 60000 / interval)) * 100) / 100;
      this.tempo.bpm = bpm;
      this.tempo.anchorMs = now + this.tempo.offsetMs;
      this.tempoChanged();
      this.updateDraft({ ...this.program, bpm }, 'tap');
    }
    return this.getState();
  }

  updateTempo(value: unknown) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ApiError('Expected tempo settings');
    const input = value as Record<string, unknown>;
    const keys = Object.keys(input);
    if (!keys.length || keys.some(key => key !== 'bpm' && key !== 'offsetMs')) throw new ApiError('Use bpm and/or offsetMs only');
    const bpm = Object.prototype.hasOwnProperty.call(input, 'bpm') ? input.bpm : this.tempo.bpm;
    const offset = Object.prototype.hasOwnProperty.call(input, 'offsetMs') ? input.offsetMs : this.tempo.offsetMs;
    if (typeof bpm !== 'number' || !Number.isFinite(bpm) || bpm < 40 || bpm > 240 || Math.abs(bpm * 100 - Math.round(bpm * 100)) > 1e-6) {
      throw new ApiError('bpm must be 40–240 with at most two decimal places');
    }
    if (typeof offset !== 'number' || !Number.isInteger(offset) || offset < -250 || offset > 250) throw new ApiError('offsetMs must be an integer from -250 to 250');
    if (bpm !== this.tempo.bpm || offset !== this.tempo.offsetMs) {
      const now = performance.now();
      const beat = (now - this.tempo.anchorMs) * this.tempo.bpm / 60000;
      this.tempo.anchorMs = now - beat * 60000 / bpm + offset - this.tempo.offsetMs;
      this.tempo.bpm = bpm;
      this.tempo.offsetMs = offset;
      this.taps = [];
      this.tempoChanged();
      this.updateDraft({ ...this.program, bpm });
    } else if (this.tempoSyncedRevision !== this.tempo.revision) this.requestTempoSync();
    return this.getState();
  }

  private tempoChanged() {
    this.tempo.revision = (this.tempo.revision + 1) >>> 0 || 1;
    this.tempoSyncedRevision = 0;
    delete this.tempoError;
    this.requestTempoSync();
  }

  private invalidateTempo(board: BoardConnection) {
    this.clocks.delete(board);
    this.tempoAcks.delete(board);
    this.tempoSyncedRevision = 0;
    this.requestTempoSync();
  }

  private requestTempoSync() {
    if (this.closed) return;
    this.tempoRequested = true;
    this.tempoAbort?.abort();
    if (!this.tempoWorker) {
      this.tempoWorker = this.syncTempoLoop().finally(() => {
        this.tempoWorker = undefined;
        if (this.tempoRequested && !this.closed) this.requestTempoSync();
      });
    }
  }

  private async getClocks(signal: AbortSignal, boards: BoardConnection[]): Promise<ClockSample[]> {
    return Promise.all(boards.map(async board => {
      const cached = this.clocks.get(board);
      if (cached && performance.now() - cached.sampledAt < 10000) return cached;
      const samples = [];
      for (let i = 0; i < 3; i++) samples.push(await board.clockSample(signal));
      if (signal.aborted) throw new Error('Clock calibration cancelled');
      const best = samples.reduce((a, b) => a.rtt < b.rtt ? a : b);
      const sample = { ...best, sampledAt: performance.now() };
      this.clocks.set(board, sample);
      board.state.rttMs = Math.round(best.rtt * 10) / 10;
      return sample;
    }));
  }

  private async syncTempoLoop() {
    while (this.tempoRequested && !this.closed) {
      this.tempoRequested = false;
      const boards = this.onlineBoards();
      if (!boards.length) {
        delete this.tempoError;
        return;
      }
      const tempo = { ...this.tempo };
      const transaction = new AbortController();
      this.tempoAbort = transaction;
      try {
        const results = await Promise.allSettled(boards.map(async board => {
          const generation = board.generation;
          const [clock] = await this.getClocks(transaction.signal, [board]);
          if (transaction.signal.aborted) return;
          const beatMs = 60000 / tempo.bpm;
          const beatNumber = Math.max(0, Math.floor((performance.now() - tempo.anchorMs) / beatMs));
          const anchor = tempo.anchorMs + beatNumber * beatMs;
          await board.request(`tempo:${tempo.revision}`, encodeTempo(tempo.revision, tempo.bpm, anchor + clock.offset, beatNumber), transaction.signal);
          if (!transaction.signal.aborted && generation === board.generation && board.state.compatible) this.tempoAcks.set(board, tempo.revision);
          this.notifySync();
        }));
        const failed = results.find((result): result is PromiseRejectedResult => result.status === 'rejected');
        if (failed) throw failed.reason;
        if (!transaction.signal.aborted && tempo.revision === this.tempo.revision) {
          this.tempoSyncedRevision = tempo.revision;
          delete this.tempoError;
        }
      } catch (error) {
        if (!transaction.signal.aborted) {
          transaction.abort();
          this.tempoSyncedRevision = 0;
          this.tempoError = (error as Error).message;
        }
      } finally {
        if (this.tempoAbort === transaction) this.tempoAbort = undefined;
      }
    }
  }

  private async awaitTempo(signal: AbortSignal, boards: BoardConnection[]) {
    if (this.tempoReady(boards)) return;
    if (!this.tempoWorker && this.tempoSyncedRevision !== this.tempo.revision) this.requestTempoSync();
    while (this.tempoWorker && !this.tempoReady(boards)) {
      const worker = this.tempoWorker;
      await this.awaitTask(worker, signal, () => this.tempoReady(boards));
    }
    if (!this.tempoReady(boards)) throw new Error(this.tempoError ?? 'Tempo is not synchronized');
  }

  private notifySync() {
    this.syncListeners.forEach(listener => listener());
  }

  private awaitTask(worker: Promise<void>, signal: AbortSignal, ready: () => boolean) {
    // A discovery worker can include towers outside this Send's snapshot.
    // Release its wait as soon as the captured towers ACK, even if others lag.
    return new Promise<void>((resolve, reject) => {
        const finish = (error?: Error) => {
          signal.removeEventListener('abort', abort);
          this.syncListeners.delete(check);
          if (error) reject(error);
          else resolve();
        };
        const abort = () => finish(new Error('Play cancelled'));
        const check = () => { if (ready()) finish(); };
        if (signal.aborted) { abort(); return; }
        signal.addEventListener('abort', abort, { once: true });
        this.syncListeners.add(check);
        check();
        worker.then(() => finish(), error => finish(error));
    });
  }

  async play(value: unknown) {
    let program: Program;
    try { program = validateProgram(value); program.bpm = this.tempo.bpm; }
    catch (error) { throw new ApiError((error as Error).message); }
    if (this.inFlight) throw new ApiError('A pattern is already being sent', 409);
    // Membership is fixed for the entire stage/commit transaction. Offline
    // optional towers can join only on a subsequent explicit Send.
    const boards = this.onlineBoards().filter(board => !board.state.stopPending);
    if (!boards.length) throw new ApiError('At least one tower needs compatible playground firmware before Play', 503);
    const generations = boards.map(board => board.generation);
    for (const board of this.participants) {
      if (!boards.includes(board)) { board.stop(); this.participants.delete(board); }
    }
    this.updateDraft(program);
    delete this.error;
    const transaction = new AbortController();
    this.inFlight = transaction;
    this.revision = (this.revision + 1) >>> 0 || 1;
    const revision = this.revision;
    const { signal } = transaction;
    const assertActive = () => {
      if (signal.aborted || this.inFlight !== transaction) throw new ApiError('Play cancelled', 409);
      if (boards.some((board, i) => !board.state.connected || !board.state.compatible || board.state.stopPending || board.generation !== generations[i])) {
        throw new Error('A participating tower disconnected; send the pattern again');
      }
    };
    try {
      await this.awaitTempo(signal, boards);
      await this.awaitBlackout(signal, boards);
      assertActive();
      program.bpm = this.tempo.bpm;
      await Promise.all(boards.map(board => board.request(`ack:${revision}:0`, encodeStage(program, revision), signal)));
      assertActive();
      const clocks = await this.getClocks(signal, boards);
      await this.awaitTempo(signal, boards);
      assertActive();
      // Leave enough time to receive both commit acknowledgements before activation.
      const lead = Math.max(750, this.timeoutMs * 2 + Math.max(...clocks.map(clock => clock.rtt)) * 2);
      const earliest = performance.now() + lead;
      const beatMs = 60000 / this.tempo.bpm;
      const startAt = this.tempo.anchorMs + Math.ceil((earliest - this.tempo.anchorMs) / beatMs) * beatMs;
      if (startAt - performance.now() > 9000) throw new Error('Connection is too slow to schedule synchronized playback');
      assertActive();
      await Promise.all(boards.map((board, i) =>
        board.request(`ack:${revision}:1`, encodeCommit(revision, startAt + clocks[i].offset), signal)
      ));
      await this.awaitTempo(signal, boards);
      assertActive();
      if (performance.now() >= startAt) throw new Error('Commit confirmation arrived after the scheduled start');
      this.participants = new Set(boards);
      this.playing = true;
      this.originMs = startAt;
      this.activeRevision = revision;
      boards.forEach(board => { board.state.activeRevision = revision; });
    } catch (error) {
      if (this.inFlight !== transaction || signal.aborted) throw new ApiError('Play cancelled', 409);
      transaction.abort();
      boards.forEach(board => board.stop());
      this.syncBlackout();
      this.participants.clear();
      this.playing = false;
      this.originMs = this.activeRevision = null;
      this.error = (error as Error).message;
      throw new ApiError(this.error, 503);
    } finally {
      if (this.inFlight === transaction) this.inFlight = undefined;
    }
    return this.getState();
  }

  stop() {
    this.stopVersion++;
    this.inFlight?.abort();
    this.inFlight = undefined;
    this.boards.forEach(board => { if (board.state.connected || this.participants.has(board) || board.state.stopPending) board.stop(); });
    this.participants.clear();
    this.browserHolds.forEach(client => { client.held = false; client.updatedAt = performance.now(); });
    this.midiHeld = this.blackoutHeld = false;
    this.syncBlackout();
    this.playing = false;
    this.originMs = this.activeRevision = null;
    delete this.error;
    return this.getState();
  }

  close() {
    this.closed = true;
    this.tempoAbort?.abort();
    this.stop();
    this.boards.forEach(board => board.close());
  }
}
