import { RainMod } from "./other/rain"
import { StrobeMod } from "./strobe"
import { RivalConsolesMod } from "./rival-consoles"
import { AmbientMod } from "./timmey/ambient"
import { SkyMod } from "./timmey/sky"
import { UbranMod } from "./timmey/urban"
import { SeeYouMod } from "./3cs/see-you"
import { SlaughterHouseMod } from "./3cs/slaughter-house"
import { ZeroSumMod } from "./3cs/zero-sum"
import { NovayaMod } from "./3cs/novaya"
import { LiveCodingMod } from "./other/live-coding"
import { BuildUpMod } from "./teder/build-up"
import { HeavyStrobeMod } from "./teder/heavy-strobe"

export const threeColoredSquareMods = {
  seeYou: new SeeYouMod,
  slaughterHouse: new SlaughterHouseMod,
  zeroSum: new ZeroSumMod,
  novaya: new NovayaMod,
}

export const timmeyMods = {
  ambient: new AmbientMod,
  sky: new SkyMod,
  urban: new UbranMod,
}

export const tederMods = {
  buildUp: new BuildUpMod,
  heavyStrobe: new HeavyStrobeMod,
  liveCoding: new LiveCodingMod,
}

export const otherMods = {
  liveCoding: new LiveCodingMod,
  strobe: new StrobeMod,
  rain: new RainMod,
  rivalConsoles: new RivalConsolesMod,
}

export const mods = tederMods