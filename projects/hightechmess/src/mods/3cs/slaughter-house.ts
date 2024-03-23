import { OctaCoreMod } from "../common/OctaCoreMod";
import { black, red } from "../palettes/colors";
import { easeIn, lerp } from "../common/math";
import { ClockPayload } from "../../clock";

export class SlaughterHouseMod extends OctaCoreMod {
  init() {
    this.setPalette([
      black,
      red
    ])
    
    this.setBrightness(255);
    this.fill(black);

    this.get(0).setRotation(70);
    this.get(1).setRotation(70);
    this.get(2).setRotation(100);
    this.get(3).setRotation(100);
  }

  private strobeBrightness = 255;

  update({ index, isKick }: ClockPayload) {
    const masterBrightness = lerp(2, 255, this.midi.fader, easeIn);

    this.each((strip, stripIndex) => strip.fill((i) => {
      const direction = stripIndex > 1 ? -1 : 1;
      return Math.sin(i / 2 + (index / 4 * direction)) > 0 ? red : black;
    }))

    if (isKick) {
      this.strobeBrightness = 255;
    }
  
    this.setBrightness(masterBrightness);

    if (this.midi.buttons.mute) {
      this.fill(red);
      this.setBrightness(this.strobeBrightness);
    }

    this.strobeBrightness = Math.max(0, this.strobeBrightness - 25);
  }
}