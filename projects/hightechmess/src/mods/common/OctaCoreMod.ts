import { Color, Mod } from "@lstudio/core"
import { ClockPayload } from "../../clock"
import { State, initialState } from "../../state"
import { Strip } from "./Strip";

export abstract class OctaCoreMod implements Mod<ClockPayload, State> {
  state: State = initialState;
  private strips: Strip[] = [];
  
  abstract init(): void
  abstract update(clockData: ClockPayload): void
  
  setState(state: State): void {
    this.state = state;
    this.strips = state.strips.map(strip => new Strip(strip.brightness, strip.rotation, strip.leds));
  }

  getStrip(index: number): Strip {
    return this.strips[index];
  }

  setPalette(palette: Color[]): void {
    this.state.palette = palette;
  }

  // Brightness is a number between 0 and 255
  setBrightness(brightness: number): void {
    this.state.strips.forEach(strip => strip.brightness = brightness);
  }
  setStripBrightness(stripIndex: number, brightness: number): void {
    this.state.strips[stripIndex].brightness = brightness;
  }

  // Rotation is a number between 0 and 180
  setStripRotation(stripIndex: number, rotation: number): void {
    this.state.strips[stripIndex].rotation = rotation;
  }
  setRotations(rotations: number[]): void {
    this.state.strips.forEach((_, i) => {
      rotations[i] && this.setStripRotation(i, rotations[i])
    });
  }

  // Fill all strips with a color
  fill(color: Color): void {
    this.state.strips.forEach(strip => strip.leds.fill(color));
  }
}
