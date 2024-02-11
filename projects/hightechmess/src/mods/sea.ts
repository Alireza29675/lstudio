import { Color, Mod } from "@lstudio/core"
import { ClockPayloadType } from "../clock";
import { State } from "../state";

const seaBlue = new Color('#00b7ff')

export class SeaMod implements Mod<ClockPayloadType, State> {
  update(state: State) {
    state.strips.forEach((strip, i) => {
      strip.leds.fill(seaBlue)
      strip.rotation = 90 + Math.sin(((Date.now() / 700) + i)) * 5
    })

    return {
      ...state,
    }
  }
}

