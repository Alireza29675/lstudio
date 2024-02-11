import { Ouput, Project, Clock } from "@lstudio/core";
import { State } from "../../state";
import { ClockPayloadType } from "../../clock";
// Replace '192.168.1.223:81' with the IP address of your ESP32 WebSocket server

type SocketOutputConstructorArgs = {
  project: Project<ClockPayloadType, State>,
  clock: Clock<ClockPayloadType>,
  url: string
}

export class SocketOutput extends Ouput<ClockPayloadType, State> {
  private ws: WebSocket;
  private ready: boolean = false;

  constructor({ project, clock, url }: SocketOutputConstructorArgs) {
    super(project, clock)
    this.ws = new WebSocket(url);
    this.ws.onopen = () => this.ready = true;
  }

  render(state: State): void {
    if (!this.ready) return;

    const numbers = state.strips[0].leds.map(c => {
      const { r, g, b} = c.getRGB()
      return [r, g, b]
    }).flat()

    // Data might need additional encoding before sending 
    const buffer = new Uint8Array(numbers);
    this.ws.send(buffer);
  }
}