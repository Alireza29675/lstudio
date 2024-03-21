import { Color, Mod } from "@lstudio/core"
import { ClockPayload } from "../../clock"
import { State, initialState } from "../../state"
import { Strip } from "./Strip";

export abstract class OctaCoreMod implements Mod<ClockPayload, State> {
  state: State = initialState;
  private strips: Strip[] = [];
  
  abstract init(): void
  abstract update(clockData: ClockPayload): void
  
  setInitialState(state: State): void {
    this.state = state;
    this.strips = state.strips.map(strip => new Strip(strip.brightness, strip.rotation, strip.leds));
  }

  setPalette(palette: Color[]): void {
    this.state.palette = palette;
  }

  setBrightness(brightness: number): void {
    this.strips.forEach(strip => strip.setBrightness(brightness));
  }

  setRotation(rotation: number): void {
    this.strips.forEach(strip => strip.setRotation(rotation));
  }

  fill(color: Color): void {
    this.strips.forEach(strip => strip.fill(color));
  }

  each(callback: (strip: Strip) => void): void {
    this.strips.forEach(callback);
  }

  pick(offset: number, count: number, callback: (strip: Strip) => void): void {
    this.strips.slice(offset, offset + count).forEach(callback);
  }

}
