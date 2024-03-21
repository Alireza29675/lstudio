import { Color } from "@lstudio/core";
import { State } from "../../state";

type StripData = State["strips"][0];

export class StripAdapter {
  private strip: StripData;
  
  constructor(strip: StripData) {
    this.strip = strip;
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
}