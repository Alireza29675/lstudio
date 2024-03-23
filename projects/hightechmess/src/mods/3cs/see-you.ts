import { OctaCoreMod } from "../common/OctaCoreMod";
import { black, darkGrey, grey, darkBlue, white } from "../palettes/colors";
import { StripAdapter } from "../common/StripAdapter";
import { easeIn, halfPi, lerp } from "../common/math";
import { ClockPayload } from "../../clock";
import { getNoise } from "../common/noise";

export class SeeYouMod extends OctaCoreMod {
  private engineFlameColors = [black, darkGrey, grey, white, darkBlue];

  init() {
    this.setPalette([
      black,
      darkGrey,
      grey,
      white,
      darkBlue
    ])
    
    this.each(strip => {
      strip.setBrightness(255);
      strip.fill(black);
      strip.setRotation(60);
    });
  }

  update({ index }: ClockPayload) {
    const masterBrightness = lerp(0, 1, this.midi.fader, easeIn);

    (index % 2 === 0) && this.each((strip, i) => {
      this.engineFlame(strip, index + i * 10);
      
      const brightness = lerp(0, 255, Math.sin(index * 0.01 + halfPi(i)), easeIn);
      strip.setBrightness(brightness * masterBrightness);
    });
  }

  engineFlame(strip: StripAdapter, index: number) {
    strip.fill((i) => {
      const noiseValue = getNoise(i / 50 + index / 50, 1) / 2 + 0.5;
      const weightedNoiseValue = i / strip.length * noiseValue;

      const colorsCount = this.engineFlameColors.length;

      // distribute noiseValue into colors
      const colorIndex = Math.floor(weightedNoiseValue * colorsCount);
      return this.engineFlameColors[colorIndex];
    });
  }
}