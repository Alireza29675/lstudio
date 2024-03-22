import { SeaMod } from "./sea"
import { RainMod } from "./rain"
import { StrobeMod } from "./strobe"
import { MetroMod } from "./metro"
import { RivalConsolesMod } from "./rival-consoles"
import { BlackMod } from "./black"
import { AmbientMod } from "./ambient"

export const mods = {
  ambient: new AmbientMod,
  rivalConsoles: new RivalConsolesMod,
  black: new BlackMod,
  strobe: new StrobeMod,
  rain: new RainMod,
  metro: new MetroMod,
  sea: new SeaMod,
}