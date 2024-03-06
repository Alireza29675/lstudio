import WebSocket from 'ws';
import { Ouput, Project, Clock } from "@lstudio/core";
import { State } from "../../state";
import { ClockPayloadType } from "../../clock";
import { rotateServo } from './commands/rotateServo';
import { setColorPalette } from './commands/setColorPallete';
import { setLedColors } from './commands/setLedColors';

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
    this.ws = new WebSocket(this.url);

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
  }

  render(): void {
    this.send(setColorPalette([
      { r: 255, g: 0, b: 0 },
      { r: 0, g: 255, b: 0 },
      { r: 0, g: 0, b: 255 },
      { r: 255, g: 255, b: 0 },
      { r: 0, g: 255, b: 255 },
      { r: 255, g: 0, b: 255 },
    ]));

    this.send(setLedColors([0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5]));
  }
}
