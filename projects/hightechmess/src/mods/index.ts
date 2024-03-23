import { SeaMod } from "./sea"
import { RainMod } from "./rain"
import { StrobeMod } from "./strobe"
import { MetroMod } from "./metro"
import { RivalConsolesMod } from "./rival-consoles"
import { BlackMod } from "./black"
import { AmbientMod } from "./ambient"
import { SkyMod } from "./sky"
import { UbranMod } from "./urban"
import { SeeYouMod } from "./3cs/see-you"
import { SlaughterHouseMod } from "./3cs/slaughter-house"
import { ZeroSumMod } from "./3cs/zero-sum"

export const mods = {
  zeroSum: new ZeroSumMod,
  slaughterHouse: new SlaughterHouseMod,
  seeYou: new SeeYouMod,
  urban: new UbranMod,
  strobe: new StrobeMod,
  sky: new SkyMod,
  ambient: new AmbientMod,
  rivalConsoles: new RivalConsolesMod,
  black: new BlackMod,
  rain: new RainMod,
  metro: new MetroMod,
  sea: new SeaMod,
}