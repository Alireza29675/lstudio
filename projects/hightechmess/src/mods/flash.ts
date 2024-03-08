import { Color, Mod } from "@lstudio/core";
import { ClockPayloadType } from "../clock";
import { State } from "../state";

const black = new Color('#000000')
const white = new Color('#ffffff')

export class FlashMod implements Mod<ClockPayloadType, State> {
  update(state: State, { frameIndex }: ClockPayloadType) {
    state.strips.forEach(strip => {
      strip.leds.fill(black)

      if (frameIndex % 8 < 3) {
        strip.leds.fill(white)
      }
    })

    return {
      ...state
    }
  }
}

