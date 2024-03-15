import { Mod } from "@lstudio/core";
import { ClockPayloadType } from "../clock";
import { State } from "../state";

export class FlashMod implements Mod<ClockPayloadType, State> {
  update(state: State, { frameIndex }: ClockPayloadType) {
    state.strips.forEach(strip => {
      strip.leds.fill(0)

      if (frameIndex % 8 < 3) {
        strip.leds.fill(1)
      }
    })

    return {
      ...state
    }
  }
}

