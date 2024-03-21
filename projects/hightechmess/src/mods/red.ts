import { OctaCoreMod } from "./common/OctaCoreMod";
import { ClockPayload } from "../clock";
import { State } from "../state";
import { black, white } from "./palettes/colors";

export class RedMod implements OctaCoreMod {
  init(state: State): State {
    state.palette = [
      black,
      white,
    ]
    state.strips.forEach(strip => {
      strip.brightness = 255;
      strip.leds.fill(0);
      strip.rotation = 0;
    });

    return {
      ...state
    }
  }

  update(state: State, { frameIndex }: ClockPayload): State {
    console.log({ frameIndex });

    return {
      ...state
    }
  }
}