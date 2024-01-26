import { Mod } from "@lstudio/core"
import { ClockPayloadType } from "../clock";
import { State } from "../state";

class StableMod extends Mod<ClockPayloadType, State> {
  update(state: State): State {
    return {...state};
  }
}

export const stableMod = new StableMod()
