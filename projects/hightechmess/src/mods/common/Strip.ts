import { Color } from "@lstudio/core";

export class Strip {
  brightness: number;
  rotation: number;
  leds: Color[];
  
  constructor(brightness: number, rotation: number, leds: Color[]) {
    this.brightness = brightness;
    this.rotation = rotation;
    this.leds = leds;
  }
}