import { OctaCoreMod } from "./common/OctaCoreMod";
import { ClockPayload } from "../clock";
import { black, blue, white, yellow } from "./palettes/colors";

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

  update({ index }: ClockPayload) {
    const gap = Math.floor(40 * this.midi.knobs.high) + 4;
    const isKick = index % gap < 2;

    this.each(strip => {
      strip.setBrightness(this.midi.fader * 20 + 1);
      strip.fill(isKick ? white : black);
      strip.setRotation(this.midi.knobs.mid * 180);
    });
  }
}