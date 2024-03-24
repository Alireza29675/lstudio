import { OctaCoreMod } from "../common/OctaCoreMod";
import { black, aqua, white, chartreuse, green, blue, tcsBlue } from "../palettes/colors";
import { ClockPayload } from "../../clock";
import { easeIn, lerp, randInt } from "../common/math";
import { clamp, throttle } from "lodash";
import { StripAdapter } from "../common/StripAdapter";
import { getNoise } from "../common/noise";

export class MemoriesOfAnAndroidMod extends OctaCoreMod {
  private brightnesses = [10, 10, 10, 10];
  private engineFlameColors = [black, green, chartreuse]

  init() {
    this.setPalette([
      black,
      white,
      chartreuse,
      green,
      blue,
      aqua,
      tcsBlue
    ]);

    this.get(0).setRotation(50);
    this.get(1).setRotation(40);
    this.get(2).setRotation(140);
    this.get(3).setRotation(130);

    this.setBrightness(255);
    this.fill(aqua)
  }

  update({ index, isKick }: ClockPayload) {
    this.each((strip, stripIndex) => {
      this.engineFlame(strip, index * 2, stripIndex >= 2);
    });

    if (this.midi.buttons.rec) {
      this.switchMod();
    }

    this.brightnesses = this.brightnesses.map(brightness => clamp(brightness - 1, 0, 255));

    this.each((strip, i) => strip.setBrightness(this.brightnesses[i]));

    if (isKick) {
      this.kick();
    }
  }

  switchMod = throttle(() => {
    this.engineFlameColors = [blue, aqua, tcsBlue]
  }, 1000, { trailing: false });

  kick = throttle(() => {
    const indexToShine = randInt(0, 3);
    this.get(indexToShine).fill(white);
    this.brightnesses[indexToShine] = 255;
  }, 100, { trailing: false });

  engineFlame(strip: StripAdapter, index: number, atEnd = false) {
    strip.fill((i) => {
      const noiseValue = getNoise(i / 50 + index / 50, 1) / 2 + 0.5;
      const weightedNoiseValue = (atEnd ? i / strip.length : 1 - (i / strip.length)) * noiseValue

      const colorsCount = this.engineFlameColors.length;

      const flameLength = lerp(1, 2, this.midi.knobs.high, easeIn);

      // distribute noiseValue into colors
      const colorIndex = Math.min(Math.floor(weightedNoiseValue * flameLength * colorsCount), colorsCount - 1);
      return this.engineFlameColors[colorIndex];
    });
  }
}