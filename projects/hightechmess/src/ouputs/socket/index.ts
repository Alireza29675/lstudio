import WebSocket from 'ws';
import { Ouput, Project, Clock } from "@lstudio/core";
import { State } from "../../state";
import { ClockPayload } from "../../clock";

import { setColorPalette } from './commands/setColorPallete';
import { setLedColors } from './commands/setLedColors';
import { rotateServo } from './commands/rotateServo';
import { setLedBrightness } from './commands/setLedBrightness';

type SocketOutputConstructorArgs = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  project: Project<ClockPayload, State, any>,
  clock: Clock<ClockPayload>,
  url: string,
  stripIndex: number,
}

const memoizeAndTriggerOnChange = <T>() => {
  let lastValue: string | null = null;

  return (value: T, callback: (value: T) => void) => {
    const serializedValue = JSON.stringify(value);
    if (lastValue !== serializedValue) {
      lastValue = serializedValue;
      callback(value);
    }
  };
}

export class OctaCoreOutput extends Ouput<ClockPayload, State> {
  private ws: WebSocket | null = null;
  private url: string;
  private ready: boolean = false;
  private stripIndex: number;

  private paletteTrigger = memoizeAndTriggerOnChange<State['palette']>();
  private ledsTrigger = memoizeAndTriggerOnChange<State['strips'][number]['leds']>();
  private rotationTrigger = memoizeAndTriggerOnChange<State['strips'][number]['rotation']>();
  private brightnessTrigger = memoizeAndTriggerOnChange<number>();

  constructor({ project, clock, url, stripIndex }: SocketOutputConstructorArgs) {
    super(project, clock);
    this.url = url;
    this.stripIndex = stripIndex;

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
    });

    this.ws.on('error', (error) => {
      console.error(`[Socket] ${error.message} ❌`);
      // this.ready = false;
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

  setPalette = (palette: State['palette']) => {
    this.send(setColorPalette(palette));
  }

  setLeds = (leds: State['strips'][number]['leds']) => {
    this.send(setLedColors(leds));
  }

  setRotation = (rotation: State['strips'][number]['rotation']) => {
    this.send(rotateServo(rotation));
  }

  setBrightness = (brightness: number) => {
    this.send(setLedBrightness(brightness));
  }
  
  render(state: State): void {
    if (!this.ready) return;
    this.paletteTrigger(state.palette, this.setPalette);
    this.ledsTrigger(state.strips[this.stripIndex].leds, this.setLeds);
    this.rotationTrigger(state.strips[this.stripIndex].rotation, this.setRotation);
    this.brightnessTrigger(state.strips[this.stripIndex].brightness, this.setBrightness);
  }
}
