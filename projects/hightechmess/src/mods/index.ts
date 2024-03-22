import { SeaMod } from "./sea"
import { RainMod } from "./rain"
import { StrobeMod } from "./strobe"
import { MetroMod } from "./metro"
import { RivalConsolesMod } from "./rival-consoles"
import { BlackMod } from "./black"
import { AmbientMod } from "./ambient"
import { SkyMod } from "./sky"

export const mods = {
  sky: new SkyMod,
  ambient: new AmbientMod,
  rivalConsoles: new RivalConsolesMod,
  black: new BlackMod,
  strobe: new StrobeMod,
  rain: new RainMod,
  metro: new MetroMod,
  sea: new SeaMod,
}