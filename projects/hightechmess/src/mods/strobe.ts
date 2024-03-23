import { OctaCoreMod } from "./common/OctaCoreMod";
import { black, tcsBlue, tcsRed, white } from "./palettes/colors";
import { ClockPayload } from "../clock";
import { clamp, lerp, randInt } from "./common/math";
import { throttle } from "lodash";

const MIN_BRIGHTNESS = 2;

export class StrobeMod extends OctaCoreMod {
  private brightnesses = [MIN_BRIGHTNESS, MIN_BRIGHTNESS, MIN_BRIGHTNESS, MIN_BRIGHTNESS];

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
      tcsBlue,
      tcsRed
    ], index / 50, i));
    
    const leakage = lerp(1, 5, this.midi.knobs.high);
    this.brightnesses = this.brightnesses.map(brightness => clamp(brightness - leakage, MIN_BRIGHTNESS, 255));

    this.each((strip, i) => strip.setBrightness(this.brightnesses[i]));
  }

  kick = throttle(() => {
    const indexToShine = randInt(0, 3);
    this.brightnesses[indexToShine] = 255;
  }, 100, { trailing: false });
}