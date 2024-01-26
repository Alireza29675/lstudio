import { Mod } from "@lstudio/core"
import { ClockPayloadType } from "../clock";
import { State } from "../state";

class StableMod implements Mod<ClockPayloadType, State> {
  update(state: State) {
    return {...state};
  }
}

export const stableMod = new StableMod()
