import { Mod } from "./Mod";
import { Setup } from "./Setup";

export class Project<ClockData, ModName extends string = ''> {
  private currentMod: ModName

  constructor(
    readonly setup: Setup,
    readonly mods: Record<ModName, Mod<ClockData>>
  ) {
    const modNames = Object.keys(mods);
    
    if (!modNames.length) {
      console.warn('You must have at least one mod for this project.');
    }

    this.currentMod = (modNames[0] || '') as ModName
  }

  getMod(): Mod<ClockData> {
    return this.mods[this.currentMod];
  }

  setMod(name: ModName) {
    this.currentMod = name;
  }

  tick(data: ClockData): void {
    this.getMod().update(this.setup, data);
  }
}
