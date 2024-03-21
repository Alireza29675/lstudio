import { Mod } from "@lstudio/core"
import { ClockPayload } from "../../clock"
import { State } from "../../state"

export abstract class OctaCoreMod implements Mod<ClockPayload, State> {
  abstract init(state: State): State
  abstract update(state: State, clockData: ClockPayload): State
}
