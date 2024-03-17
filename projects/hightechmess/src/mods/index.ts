import { Mod } from "@lstudio/core"
import { SeaMod } from "./sea"
import { ClockPayload } from "../clock"
import { State } from "../state"
import { RainMod } from "./rain"

export type OctaCoreMod = Mod<ClockPayload, State>

export const mods = {
  rain: new RainMod,
  sea: new SeaMod,
}