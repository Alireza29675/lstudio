import { RainMod } from "./rain"
import { StrobeMod } from "./strobe"
import { RivalConsolesMod } from "./rival-consoles"
import { AmbientMod } from "./timmey/ambient"
import { SkyMod } from "./timmey/sky"
import { UbranMod } from "./timmey/urban"
import { SeeYouMod } from "./3cs/see-you"
import { SlaughterHouseMod } from "./3cs/slaughter-house"
import { ZeroSumMod } from "./3cs/zero-sum"
import { NovayaMod } from "./3cs/novaya"

export const mods = {
  seeYou: new SeeYouMod,
  slaughterHouse: new SlaughterHouseMod,
  novaya: new NovayaMod,
  urban: new UbranMod,
  sky: new SkyMod,
  strobe: new StrobeMod,
  zeroSum: new ZeroSumMod,
  ambient: new AmbientMod,
  rivalConsoles: new RivalConsolesMod,
  rain: new RainMod,
}