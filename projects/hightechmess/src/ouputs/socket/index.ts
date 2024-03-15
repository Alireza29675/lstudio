import WebSocket from 'ws';
import { Ouput, Project, Clock } from "@lstudio/core";
import { State } from "../../state";
import { ClockPayloadType } from "../../clock";
import { rotateServo } from './commands/rotateServo';
import { setColorPalette } from './commands/setColorPallete';
import { setLedBrightness } from './commands/setLedBrightness';
import { setLedColors } from './commands/setLedColors';
import midi from '../../mods/utils/midi';

type SocketOutputConstructorArgs = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  project: Project<ClockPayloadType, State, any>,
  clock: Clock<ClockPayloadType>,
  url: string,
  iOffset?: number,
}

export class OctaCoreOutput extends Ouput<ClockPayloadType, State> {
  private ws: WebSocket | null = null;
  private url: string;
  private ready: boolean = false;
  
  private i = 0;
  private iOffset = 0;

  constructor({ project, clock, url, iOffset }: SocketOutputConstructorArgs) {
    super(project, clock);
    this.url = url;

    this.iOffset = iOffset || 0;

    this.connect();
  }

  connect() {
    try {
      this.ws = new WebSocket(this.url);
    } catch (e) {
      setTimeout(() => this.connect(), 3000);
      return;
    }

    this.ws.on('open', () => {
      this.ready = true;
      console.log(`[Socket] Connected to ${this.url} ✅`);
      this.setup();
    });

    this.ws.on('error', (error) => {
      console.error(`[Socket] ${error.message} ❌`);
      this.ready = false;
    });

    this.ws.on('close', () => {
      this.ready = false;
      console.log(`[Socket] Disconnected from ${this.url} ❌`);
      setTimeout(() => this.connect(), 3000);
    });
  }

  send(data: Buffer) {
    if (!this.ready) return;
    this.ws?.send(data);
  }

  setup(): void {
    this.send(rotateServo(50));
    this.send(setColorPalette([
      { r: 0, g: 0, b: 0 },
      { r: 255, g: 255, b: 255 },
      { r: 250, g: 0, b: 100 },
      { r: 255, g: 255, b: 0 },
      { r: 0, g: 255, b: 255 },
      { r: 255, g: 0, b: 255 },
    ]));
    this.send(setLedColors(Array(60).fill(2)));
  }
  
  render(): void {
    this.i++;
    const speed = midi.state.knobs[0][0] * 10 + 1;
    const divergency = midi.state.knobs[1][0];
    const brightness = Math.max(0, Math.floor(Math.sin((this.i / speed) + (this.iOffset * divergency)) * 200) + 0) + 55;
    this.send(setLedBrightness(brightness));
  }
}
