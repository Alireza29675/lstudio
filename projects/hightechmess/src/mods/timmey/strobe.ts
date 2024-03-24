import { OctaCoreMod } from "../common/OctaCoreMod";
import { black, aqua, white } from "../palettes/colors";
import { ClockPayload } from "../../clock";
import { clamp, easeIn, lerp, randInt } from "../common/math";
import { throttle } from "lodash";

export class StrobeMod extends OctaCoreMod {
  private brightnesses = [0, 0, 0, 0];
  private timesKicked = 0;

  private isShifting = false;
  private shouldBeOff = false;

  init() {
    this.setPalette([
      black,
      white,
      aqua,
    ]);

    this.setBrightness(255);
    this.fill(aqua)
  }

  update({ isKick }: ClockPayload) {
    if (isKick) {
      this.kick();

      if (this.isShifting || this.timesKicked % 8 === 0) {
        this.brightnesses = [255, 255, 255, 255]
      }
    }

    if (this.midi.buttons.rec) {
      this.changeTheRotation();
    }
    
    const strobeness = lerp(5, 255, this.midi.fader, easeIn);
    const leakage = this.isShifting ? 30 : lerp(0.5, 5, this.midi.knobs.high);
    this.brightnesses = this.brightnesses.map(brightness => clamp(brightness - leakage, strobeness, 255));

    if (this.shouldBeOff) {
      this.brightnesses = [0, 0, 0, 0];
    }

    this.each((strip, i) => strip.setBrightness(this.brightnesses[i]));
  }

  changeTheRotation = throttle(() => {
    this.get(0).setRotation(50);
    this.get(1).setRotation(40);
    this.get(2).setRotation(140);
    this.get(3).setRotation(130);

    this.shouldBeOff = true;
    this.isShifting = true;

    setTimeout(() => {
      this.shouldBeOff = false;
    }, 2000);

    setTimeout(() => {
      this.isShifting = false;
    }, 20000);
  }, 1000, { trailing: false });

  kick = throttle(() => {
    this.timesKicked++;
    const indexToShine = randInt(0, 3);
    this.brightnesses[indexToShine] = 255;
  }, 100, { trailing: false });
}