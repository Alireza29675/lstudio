import WebSocket from "ws";
import { Clock, Ouput, Project } from "@lstudio/core";

import { ClockPayload } from "../../clock";
import { State } from "../../state";
import { rotateServo } from "./commands/rotateServo";
import { setColorPalette } from "./commands/setColorPallete";
import { setLedBrightness } from "./commands/setLedBrightness";
import { setLedColors } from "./commands/setLedColors";

type SocketOutputConstructorArgs = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  project: Project<ClockPayload, State, any>;
  clock: Clock<ClockPayload>;
  url: string;
  stripIndex: number;
};

const RECONNECT_DELAY_MS = 2000;

const memoizeAndTriggerOnChange = <T>() => {
  let lastValue: string | null = null;

  return {
    trigger(value: T, callback: (value: T) => void) {
      const serializedValue = JSON.stringify(value);
      if (lastValue !== serializedValue) {
        lastValue = serializedValue;
        callback(value);
      }
    },
    reset() {
      lastValue = null;
    },
  };
};

export class OctaCoreOutput extends Ouput<ClockPayload, State> {
  private ws: WebSocket | null = null;
  private ready = false;
  private reconnectTimer: NodeJS.Timeout | null = null;

  private currentPalette: State["palette"] = [];

  private readonly paletteTrigger =
    memoizeAndTriggerOnChange<State["palette"]>();
  private readonly ledsTrigger =
    memoizeAndTriggerOnChange<State["strips"][number]["leds"]>();
  private readonly rotationTrigger =
    memoizeAndTriggerOnChange<State["strips"][number]["rotation"]>();
  private readonly brightnessTrigger = memoizeAndTriggerOnChange<number>();

  constructor(
    private readonly args: SocketOutputConstructorArgs
  ) {
    super(args.project, args.clock);
    this.connect();
  }

  private get url() {
    return this.args.url;
  }

  private get stripIndex() {
    return this.args.stripIndex;
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) {
      return;
    }

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, RECONNECT_DELAY_MS);
  }

  private connect() {
    if (
      this.ws &&
      (this.ws.readyState === WebSocket.OPEN ||
        this.ws.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    try {
      this.ws = new WebSocket(this.url);
    } catch (error) {
      console.error(
        `[Socket ${this.stripIndex}] Failed to create ${this.url}: ${String(error)}`
      );
      this.scheduleReconnect();
      return;
    }

    this.ws.on("open", () => {
      this.ready = true;
      this.resetMemoization();
      this.syncCurrentState();
      console.log(
        `[Socket ${this.stripIndex}] Connected to ${this.url} ✅`
      );
    });

    this.ws.on("error", (error) => {
      console.error(
        `[Socket ${this.stripIndex}] ${error.message} ❌`
      );
    });

    this.ws.on("close", () => {
      this.ready = false;
      console.log(
        `[Socket ${this.stripIndex}] Disconnected from ${this.url} ❌`
      );
      this.scheduleReconnect();
    });
  }

  private resetMemoization() {
    this.paletteTrigger.reset();
    this.ledsTrigger.reset();
    this.rotationTrigger.reset();
    this.brightnessTrigger.reset();
  }

  private send(data: Buffer) {
    if (!this.ready || this.ws?.readyState !== WebSocket.OPEN) {
      return;
    }

    this.ws.send(data);
  }

  private setPalette = (palette: State["palette"]) => {
    this.currentPalette = palette;
    this.send(setColorPalette(palette));
  };

  private setLeds = (leds: State["strips"][number]["leds"]) => {
    const colorIndices = leds.map((led) => {
      const colorIndex = this.currentPalette.indexOf(led);

      if (colorIndex === -1) {
        throw new Error(
          `Color ${led.toString()} is not present in the active palette for strip ${this.stripIndex}.`
        );
      }

      return colorIndex;
    });

    this.send(setLedColors(colorIndices));
  };

  private setRotation = (
    rotation: State["strips"][number]["rotation"]
  ) => {
    this.send(rotateServo(rotation));
  };

  private setBrightness = (brightness: number) => {
    this.send(setLedBrightness(brightness));
  };

  private syncCurrentState() {
    const state = this.project.state;
    const strip = state.strips[this.stripIndex];

    if (!strip) {
      console.error(
        `[Socket ${this.stripIndex}] No strip state exists for ${this.url}.`
      );
      return;
    }

    // Order matters: LEDs reference palette indices.
    this.setPalette(state.palette);
    this.setLeds(strip.leds);
    this.setRotation(strip.rotation);
    this.setBrightness(strip.brightness);

    // Seed memoization after a successful full sync so unchanged frames do
    // not resend the same data.
    this.paletteTrigger.trigger(state.palette, () => {});
    this.ledsTrigger.trigger(strip.leds, () => {});
    this.rotationTrigger.trigger(strip.rotation, () => {});
    this.brightnessTrigger.trigger(strip.brightness, () => {});
  }

  render(state: State): void {
    const strip = state.strips[this.stripIndex];
    if (!strip) {
      return;
    }

    this.paletteTrigger.trigger(state.palette, this.setPalette);
    this.ledsTrigger.trigger(strip.leds, this.setLeds);
    this.rotationTrigger.trigger(strip.rotation, this.setRotation);
    this.brightnessTrigger.trigger(
      strip.brightness,
      this.setBrightness
    );
  }
}
