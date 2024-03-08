import WebSocket from 'ws';
import { Ouput, Project, Clock } from "@lstudio/core";
import { State } from "../../state";
import { ClockPayloadType } from "../../clock";
import { rotateServo } from './commands/rotateServo';
import { setColorPalette } from './commands/setColorPallete';
import { setLedColors } from './commands/setLedColors';
import { setLedBrightness } from './commands/setLedBrightness';

type SocketOutputConstructorArgs = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  project: Project<ClockPayloadType, State, any>,
  clock: Clock<ClockPayloadType>,
  url: string
}

export class OctaCoreOutput extends Ouput<ClockPayloadType, State> {
  private ws: WebSocket | null = null;
  private url: string;
  private ready: boolean = false;

  constructor({ project, clock, url }: SocketOutputConstructorArgs) {
    super(project, clock);
    this.url = url;

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
      this.setup();
    });

    this.ws.on('close', () => {
      this.ready = false;
      // Retry every 3 seconds
      setTimeout(() => this.connect(), 3000);
    });
  }

  send(data: Buffer) {
    if (!this.ready) return;
    this.ws?.send(data);
  }

  setup(): void {
    this.send(rotateServo(90));
    this.send(setLedBrightness(30))
    this.send(setColorPalette([
      { r: 255, g: 0, b: 0 },
      { r: 0, g: 255, b: 0 },
      { r: 0, g: 0, b: 255 },
      { r: 255, g: 255, b: 0 },
      { r: 0, g: 255, b: 255 },
      { r: 255, g: 0, b: 255 },
    ]));
  }
  
  render(): void {
    this.send(setLedColors(new Array(60).fill(Math.floor(Math.random() * 6))));
  }
}
