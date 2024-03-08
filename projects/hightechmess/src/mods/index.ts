import './utils/midi'

import { FlashMod } from "./flash"
import { SandclockMod } from "./sandclock"
import { SeaMod } from "./sea"

export const mods = {
  sea: new SeaMod,
  flash: new FlashMod,
  sandclock: new SandclockMod
}