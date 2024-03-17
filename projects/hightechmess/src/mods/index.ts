import { Mod } from "@lstudio/core"
import { SeaMod } from "./sea"
import { ClockPayload } from "../clock"
import { State } from "../state"
import { RainMod } from "./rain"
import { StrobeMod } from "./strobe"
import { MetroMod } from "./metro"

export type OctaCoreMod = Mod<ClockPayload, State>

export const mods = {
  metro: new MetroMod,
  sea: new SeaMod,
  rain: new RainMod,
  strobe: new StrobeMod,
}