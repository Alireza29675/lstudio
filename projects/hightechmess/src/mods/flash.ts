import { Color, Mod } from "@lstudio/core"
import { ClockPayloadType } from "../clock";
import { State } from "../state";

const black = new Color('#000000')
const white = new Color('#eeeeee')

export class FlashMod implements Mod<ClockPayloadType, State> {
  update(state: State) {
    state.strips.forEach(strip => {
      const { r } = strip.leds[0].getRGB()


      strip.rotation += 0.1

      if (r > 100) {
        strip.leds.fill(black)
      } else {
        strip.leds.fill(white)
      }
    })

    return {
      ...state
    }
  }
}

