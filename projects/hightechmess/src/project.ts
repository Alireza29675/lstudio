import { Mod, Project } from "@lstudio/core";
import { ClockPayload } from "./clock";
import { State, initialState } from "./state";
import { mods } from "./mods";
import midi from "./common/midimix";

type ModList = keyof typeof mods;

export class OctaCoreProject extends Project<ClockPayload, State, ModList> {
  constructor(initialState: State, mods: Record<ModList, Mod<ClockPayload, State>>) {
    super(initialState, mods)

    midi.onComboButtonPressed((index, pressed) => {
      const released = !pressed
      const modNames = Object.keys(mods) as (keyof typeof mods)[]
    
      if (released && index < modNames.length) {
        project.selectMod(modNames[index])
      }
    });
  }

  selectMod(name: ModList): void {
    super.selectMod(name)

    const modIndex = Object.keys(mods).indexOf(name)
    midi.turnOnColumnLights(modIndex)
  }
}

export const project = new OctaCoreProject(initialState, mods)