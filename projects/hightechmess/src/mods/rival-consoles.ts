import { OctaCoreMod } from "./common/OctaCoreMod";
import { ClockPayload } from "../clock";
import { black, blue, white, yellow } from "./palettes/colors";

// export class RivalConsolesMod extends OctaCoreMod {
//   init() {
//     this.setPalette([
//       black,
//       white,
//     ])
//     this.each(strip => {
//       strip.setBrightness(5);
//       strip.fill(0);
//       strip.setRotation(0);
//     });
//   }

//   update({ frameIndex }: ClockPayload) {
//     const isKick = frameIndex % 4 === 0;

//     this.each(strip => {
//       strip.fill(isKick ? white : black);
//     });
//   }
// }

// --------

export class RivalConsolesMod extends OctaCoreMod {
  init() {
    this.setPalette([
      black,
      white,
      yellow,
      blue
    ])
    this.each(strip => {
      strip.setBrightness(5);
      strip.fill(black);
      strip.setRotation(0);
    });
  }

  update({ frameIndex }: ClockPayload) {
    const gap = Math.floor(40 * this.midi.knobs.high) + 4;
    const isKick = frameIndex % gap < 2;

    this.each(strip => {
      strip.setBrightness(this.midi.fader * 20 + 1);
      strip.fill(isKick ? white : black);
      strip.setRotation(this.midi.knobs.mid * 180);
    });
  }
}