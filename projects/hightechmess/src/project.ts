import { Mod, Project } from "@lstudio/core";
import { ClockPayload } from "./clock";
import { State, initialState } from "./state";
import { mods } from "./mods";
import midi from "./common/midimix";

type ModList = keyof typeof mods;

export class OctaCoreProject extends Project<ClockPayload, State, ModList> {
  constructor(initialState: State, mods: Record<ModList, Mod<ClockPayload, State>>) {
    super(initialState, mods)

    const modNames = Object.keys(this.mods) as ModList[];
    const selectColumn = (index: number) => {
      if (index < 0 || index >= modNames.length) return;
      const name = modNames[index];
      if (this.getMod() === this.mods[name]) return;
      this.selectMod(name);
      console.log(`[Preset] Column ${index + 1}: ${name}`);
    };

    midi.onComboButtonPressed((index, pressed) => {
      if (!pressed) selectColumn(index);
    });

    // Some mappings send ordinary MUTE notes while SOLO is held. Remember the
    // modifier on press so releasing SOLO first still completes the gesture.
    // Use live events: a cached held button must not become a new gesture.
    let soloHeld = false;
    midi.onSoloButtonPressed(pressed => { soloHeld = pressed; });
    const soloMuteColumns = new Set<number>();
    midi.onButtonPressed((row, col, pressed) => {
      if (row !== 0) return;
      if (pressed) {
        if (soloHeld) soloMuteColumns.add(col);
        else soloMuteColumns.delete(col);
      } else if (soloMuteColumns.delete(col)) {
        selectColumn(col);
      }
    });
  }

  selectMod(name: ModList): void {
    super.selectMod(name)

    const modIndex = Object.keys(this.mods).indexOf(name)
    midi.turnOnColumnLights(modIndex)
  }
}

export const project = new OctaCoreProject(initialState, mods)
