import { Setup } from "./Setup";

export abstract class Mod<ClockData> {
  abstract update(setup: Setup, data: ClockData): void
}