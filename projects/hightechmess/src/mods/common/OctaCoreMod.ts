import { Color, Mod } from "@lstudio/core"
import { ClockPayload } from "../../clock"
import { State, initialState } from "../../state"
import { StripAdapter } from "./StripAdapter";

export abstract class OctaCoreMod implements Mod<ClockPayload, State> {
  state: State = initialState;
  private strips: StripAdapter[] = [];
  
  abstract init(): void
  abstract update(clockData: ClockPayload): void
  
  onSelected(state: State): void {
    this.state = state;
    this.strips = state.strips.map(strip => new StripAdapter(strip));
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

  get(index: number): StripAdapter {
    return this.strips[index];
  }

  each(callback: (strip: StripAdapter) => void): void {
    this.strips.forEach(callback);
  }

  pick(offset: number, count: number, callback: (strip: StripAdapter) => void): void {
    this.strips.slice(offset, offset + count).forEach(callback);
  }

  some(count: number, callback: (strip: StripAdapter) => void): void {
    count = Math.min(count, this.strips.length);
    const shuffledIndexes = new Array(count).fill(0).map((_, i) => i).sort(() => Math.random() - 0.5);
    const pickedIndexes = shuffledIndexes.slice(0, count);
    pickedIndexes.forEach(index => callback(this.strips[index]));
  }
}
