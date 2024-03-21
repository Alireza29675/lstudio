import { OctaCoreMod } from "./common/OctaCoreMod";
import { ClockPayload } from "../clock";
import midi from "../common/midimix";
import { State } from "../state";
import { black, blue, white, yellow } from "./palettes/colors";

// export class RivalConsolesMod implements OctaCoreMod {
//   init(state: State): State {
//     state.palette = [
//       black,
//       white,
//     ]
//     state.strips.forEach(strip => {
//       strip.brightness = 5;
//       strip.leds.fill(0);
//       strip.rotation = 0;
//     });

//     return {
//       ...state
//     }
//   }

//   update(state: State, { frameIndex }: ClockPayload): State {
//     const isKick = frameIndex % 4 === 0;

//     state.strips.forEach(strip => {
//       strip.leds.fill(isKick ? 1 : 0);
//     });

//     return {
//       ...state
//     }
//   }
// }

// --------

export class RivalConsolesMod implements OctaCoreMod {
  init(state: State): State {
    state.palette = [
      black,
      white,
      yellow,
      blue
    ]
    state.strips.forEach(strip => {
      strip.brightness = 5;
      strip.leds.fill(0);
      strip.rotation = 0;
    });

    return {
      ...state
    }
  }

  update(state: State, { frameIndex }: ClockPayload): State {
    const gap = Math.floor(40 * midi.state.knobs[0][0]) + 4;
    const isKick = frameIndex % gap < 2;

    state.strips.forEach(strip => {
      strip.brightness = midi.state.faders[0] * 20 + 1;
      strip.leds.fill(isKick ? 1 : 0);
      strip.rotation = midi.state.knobs[1][0] * 180;
    });

    return {
      ...state
    }
  }
}