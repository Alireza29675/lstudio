import { Color } from "@lstudio/core";
import { State } from "../../state";

export class StripAdapter {
  constructor(readonly state: State, readonly stripIndex: number) {
  }

  get strip() {
    return this.state.strips[this.stripIndex];
  }

  setBrightness(brightness: number): void {
    this.strip.brightness = brightness;
  }

  setRotation(rotation: number): void {
    this.strip.rotation = rotation;
  }

  fill(color: Color): void {
    this.strip.leds.fill(color);
  }

  setRangeColor(start: number, end: number, color: Color): void {
    const length = this.strip.leds.length;
    const min = Math.min(start % length, end % length);
    const max = Math.max(start % length, end % length);
    for (let i = min; i < max; i++) {
      this.strip.leds[i] = color;
    }
  }

  setPixelColor(index: number, color: Color): void {
    this.strip.leds[index] = color;
  }
}