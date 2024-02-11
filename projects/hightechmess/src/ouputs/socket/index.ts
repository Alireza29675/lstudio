import WebSocket from 'ws';
import { Ouput, Project, Clock } from "@lstudio/core";
import { State } from "../../state";
import { ClockPayloadType } from "../../clock";

type SocketOutputConstructorArgs = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  project: Project<ClockPayloadType, State, any>,
  clock: Clock<ClockPayloadType>,
  url: string
}

export class SocketOutput extends Ouput<ClockPayloadType, State> {
  private ws: WebSocket;
  private ready: boolean = false;

  constructor({ project, clock, url }: SocketOutputConstructorArgs) {
    super(project, clock)
    this.ws = new WebSocket(url);
    this.ws.on('open', () => this.ready = true);
  }

  render(state: State): void {
    if (!this.ready) return;

    const numbers = state.strips[0].leds.map(c => {
      const { r, g, b} = c.getRGB()
      return [r, g, b]
    }).flat()

    // Data might need additional encoding before sending 
    const buffer = Buffer.from(numbers);
    this.ws.send(buffer);
  }
}