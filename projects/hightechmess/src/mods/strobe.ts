import { OctaCoreMod } from "./common/OctaCoreMod";
import { black, tcsBlue, tcsRed, white } from "./palettes/colors";
import { ClockPayload } from "../clock";
import { clamp, easeOut, lerp, randInt } from "./common/math";
import { throttle } from "lodash";

export class StrobeMod extends OctaCoreMod {
  private brightnesses = [0, 0, 0, 0];

  init() {
    this.setPalette([
      black,
      white,
      tcsBlue,
      tcsRed
    ]);

    this.setBrightness(255);
  }

  update({ index, isKick }: ClockPayload) {
    if (isKick) this.kick();

    this.each((strip, i) => strip.fillNoise([
      white,
      tcsBlue
    ], index / 50, i));
    
    const strobeness = lerp(255, 5, this.midi.fader, easeOut);
    const leakage = lerp(0.5, 5, this.midi.knobs.high);
    this.brightnesses = this.brightnesses.map(brightness => clamp(brightness - leakage, strobeness, 255));

    this.each((strip, i) => strip.setBrightness(this.brightnesses[i]));
  }

  kick = throttle(() => {
    const indexToShine = randInt(0, 3);
    this.brightnesses[indexToShine] = 255;
  }, 100, { trailing: false });
}