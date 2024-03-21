import { Mod } from "@lstudio/core"
import { SeaMod } from "./sea"
import { ClockPayload } from "../clock"
import { State } from "../state"
import { RainMod } from "./rain"
import { StrobeMod } from "./strobe"
import { MetroMod } from "./metro"
import { HamedMod } from "./hamed"

export type OctaCoreMod = Mod<ClockPayload, State>

export const mods = {
  hamed: new HamedMod,
  metro: new MetroMod,
  strobe: new StrobeMod,
  sea: new SeaMod,
  rain: new RainMod,
}