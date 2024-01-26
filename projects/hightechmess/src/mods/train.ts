import { Mod } from "@lstudio/core"
import { ClockPayloadType } from "../clock";
import { State } from "../state";

class TrainMod implements Mod<ClockPayloadType, State> {
  init(state: State) {
    const leds = new Array(state.leds.length).fill(0)
    leds[0] = 1

    return {
      leds
    }
  }

  update(state: State) {
    state.leds.unshift(state.leds.pop() || 0)

    return {
      leds: [...state.leds],
    }
  }
}

export const trainMod = new TrainMod()
