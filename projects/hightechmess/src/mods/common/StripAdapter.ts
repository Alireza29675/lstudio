import { Color } from "@lstudio/core";
import { State } from "../../state";
import { getNoise } from "./noise";

export class StripAdapter {
  constructor(readonly state: State, readonly stripIndex: number) {
  }

  private get strip() {
    return this.state.strips[this.stripIndex];
  }

  get length(): number {
    return this.strip.leds.length;
  }

  get leds() {
    return this.strip.leds;
  }

  setBrightness(brightness: number): void {
    this.strip.brightness = brightness;
  }

  setRotation(rotation: number): void {
    this.strip.rotation = rotation;
  }

  fill(colorOrMapFn: Color | ((index: number, color: Color) => Color)): void {
    if (typeof colorOrMapFn === 'function') {
      this.strip.leds = this.strip.leds.map((color, i) => colorOrMapFn(i, color));
      return;
    }

    this.strip.leds.fill(colorOrMapFn as Color);
  }

  setRangeColor(start: number, end: number, color: Color): void {
    const length = this.strip.leds.length;
    const min = Math.min(start % length, end % length);
    const max = Math.max(start % length, end % length);
    for (let i = min; i < max; i++) {
      this.strip.leds[i] = color;
    }
  }

  fillNoise(colors: Color[], offsetX: number, offsetY: number) {
    this.fill((i) => {
      const noiseValue = getNoise(i / 50 + offsetX, offsetY) / 2 + 0.5;

      const colorsCount = colors.length;

      // distribute noiseValue into colors
      const colorIndex = Math.floor(noiseValue * colorsCount);
      return colors[colorIndex];
    });
  }

  setPixelColor(index: number, color: Color): void {
    this.strip.leds[index] = color;
  }
}