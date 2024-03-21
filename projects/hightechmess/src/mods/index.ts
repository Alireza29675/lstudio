import { SeaMod } from "./sea"
import { RainMod } from "./rain"
import { StrobeMod } from "./strobe"
import { MetroMod } from "./metro"
import { RivalConsolesMod } from "./rival-consoles"
import { BlackMod } from "./black"

export const mods = {
  black: new BlackMod,
  rivalConsoles: new RivalConsolesMod,
  strobe: new StrobeMod,
  rain: new RainMod,
  metro: new MetroMod,
  sea: new SeaMod,
}