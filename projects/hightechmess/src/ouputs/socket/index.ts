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

function print3BitSequences(payload: number[]) {
  let bitStream = ""; // String to hold the binary representation
  // Convert each byte to binary and concatenate
  payload.forEach(byte => {
      bitStream += byte.toString(2).padStart(8, '0');
  });

  // Now print each 3-bit sequence
  const output = []; // Array to hold the 3-bit values
  for (let i = 0; i < bitStream.length; i += 3) {
      // Take 3 bits at a time
      const bits = bitStream.substring(i, i + 3);
      if(bits.length < 3) break; // If there are fewer than 3 bits left, stop processing
      output.push(parseInt(bits, 2)); // Convert the 3 bits to a number and add to the output
  }
  console.log(output.length, output.join('')); // Print all 3-bit values in a row
}

type RGBColor = [number, number, number];

// Rotate servo function with angle parameter typed
function rotateServo(ws: WebSocket, angle: number): void {
  angle = Math.max(0, Math.min(angle, 180));
  const commandId = 0; // Command 000 for rotate servo
  const commandByte = (commandId << 5) | (angle >> 3);
  const angleByte = (angle << 5) & 0xFF;
  ws.send(Buffer.from([commandByte, angleByte]));
}

function setBrushColors(ws: WebSocket, colors: RGBColor[]) {
  if (colors.length !== 8) {
    console.error('Exactly 8 colors are required');
    return;
  }
  const commandId = 1 << 5; // Command 001 for set brush colors
  const payload = [commandId];
  colors.forEach(color => {
    // Directly push the R, G, B values into the payload
    payload.push(color[0], color[1], color[2]); // Assuming each color is an object {r: red, g: green, b: blue}
  });
  ws.send(new Uint8Array(payload)); // Use Uint8Array for binary data
}


function colorLEDStripByIndex(ws: WebSocket, indices: number[]): void {
  const commandId = 2 << 5; // Command 010 for color LED strip by index
  const payload = [commandId];
  indices.forEach((index, i) => {
    const bitPosition = i * 3; // Each index occupies 3 bits
    const byteIndex = 1 + Math.floor(bitPosition / 8);
    const bitOffset = bitPosition % 8;

    // Ensure byteIndex and byteIndex + 1 exist in the payload
    if (payload[byteIndex] === undefined) payload[byteIndex] = 0;
    if (bitOffset > 5 && payload[byteIndex + 1] === undefined) payload[byteIndex + 1] = 0;

    // Adjust bit packing to handle spanning byte boundaries correctly
    payload[byteIndex] |= (index << (5 - bitOffset)) & 0xFF; // Apply mask to ensure no overflow
    if (bitOffset > 5) {
      payload[byteIndex + 1] |= (index >> (bitOffset - 2)) & 0xFF; // Ensure shifted bits fit in the next byte
    }
  });

  print3BitSequences(payload)

  // Convert payload to a buffer and send
  ws.send(Buffer.from(payload));
}

export class SocketOutput extends Ouput<ClockPayloadType, State> {
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
      rotateServo(this.ws!, 90);
      setBrushColors(this.ws!, [
        [0, 0, 0],
        [255, 255, 0],
        [0, 0, 0],
        [0, 0, 0],
        [0, 0, 0],
        [0, 0, 0],
        [0, 0, 0],
        [0, 0, 0]
      ]);
    });

    this.ws.on('close', () => {
      this.ready = false;
      // Retry every 3 seconds
      setTimeout(() => this.connect(), 3000);
    });
  }

  render(): void {
    if (!this.ready) return;
    colorLEDStripByIndex(this.ws!, new Array(60).fill(0).map((_, i) => {
      if (i % 11 === 0) {
        return 1;
      }
      return 0;
    }));
  }
}