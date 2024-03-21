import { OctaCoreMod } from "./common/OctaCoreMod";
import { ClockPayload } from "../clock";
import midi from "../common/midimix";
import { black, blue, white, yellow } from "./palettes/colors";

// export class RivalConsolesMod extends OctaCoreMod {
//   init() {
//     this.state.palette = [
//       black,
//       white,
//     ]
//     this.state.strips.forEach(strip => {
//       strip.brightness = 5;
//       strip.leds.fill(0);
//       strip.rotation = 0;
//     });
//   }

//   update({ frameIndex }: ClockPayload) {
//     const isKick = frameIndex % 4 === 0;

//     this.state.strips.forEach(strip => {
//       strip.leds.fill(isKick ? white : black);
//     });
//   }
// }

// --------

export class RivalConsolesMod extends OctaCoreMod {
  init() {
    this.state.palette = [
      black,
      white,
      yellow,
      blue
    ]
    this.state.strips.forEach(strip => {
      strip.brightness = 5;
      strip.leds.fill(black);
      strip.rotation = 0;
    });
  }

  update({ frameIndex }: ClockPayload) {
    const gap = Math.floor(40 * midi.state.knobs[0][0]) + 4;
    const isKick = frameIndex % gap < 2;

    this.state.strips.forEach(strip => {
      strip.brightness = midi.state.faders[0] * 20 + 1;
      strip.leds.fill(isKick ? white : black);
      strip.rotation = midi.state.knobs[1][0] * 180;
    });
  }
}