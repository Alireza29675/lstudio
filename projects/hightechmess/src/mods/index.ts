import { RainMod } from "./other/rain"
import { DaylightMod } from "./other/daylight"
import { StrobeMod } from "./timmey/strobe"
import { RivalConsolesMod } from "./rival-consoles"
import { AmbientMod } from "./timmey/ambient"
import { SkyMod } from "./timmey/sky"
import { UbranMod } from "./timmey/urban"
import { SeeYouMod } from "./3cs/see-you"
import { SlaughterHouseMod } from "./3cs/slaughter-house"
import { ZeroSumMod } from "./3cs/zero-sum"
import { NovayaMod } from "./3cs/novaya"
import { LiveCodingMod } from "./other/live-coding"
import { CornersMod } from "./teder/corners"
import { HeavyStrobeMod } from "./teder/heavy-strobe"
import { TurbinMod } from "./teder/turbin"
import { ElevatorsMod } from "./teder/elevators"
import { MemoriesOfAnAndroidMod } from "./timmey/memories-of-an-android"
import { SimplePhotographyMod } from "./other/simple-photography"
import { WeatherReactiveMod } from "./other/weather-reactive"

export const timmeyMods = {
  ambient: new AmbientMod,
  sky: new SkyMod,
  urban: new UbranMod,
  strobe: new StrobeMod,
  memoriesOfAnAndroid: new MemoriesOfAnAndroidMod,
}

export const threeColoredSquareMods = {
  strobe: new StrobeMod,
  seeYou: new SeeYouMod,
  slaughterHouse: new SlaughterHouseMod,
  zeroSum: new ZeroSumMod,
  novaya: new NovayaMod,
}

export const tederMods = {
  elevators: new ElevatorsMod,
  heavyStrobe: new HeavyStrobeMod,
  cornersMod: new CornersMod,
  turbin: new TurbinMod,
  liveCoding: new LiveCodingMod,
}

export const otherMods = {
  weatherReactive: new WeatherReactiveMod,
  simplePhotography: new SimplePhotographyMod,
  daylight: new DaylightMod,
  liveCoding: new LiveCodingMod,
  rain: new RainMod,
  rivalConsoles: new RivalConsolesMod,
}

export const mods = otherMods
