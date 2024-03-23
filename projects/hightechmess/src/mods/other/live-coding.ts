import { ClockPayload } from "../../clock";
import { OctaCoreMod } from "../common/OctaCoreMod";
import { easeIn, lerp } from "../common/math";
import { black, oliveDrab, green, white } from "../palettes/colors";

export class LiveCodingMod extends OctaCoreMod {
  init() {
    this.setPalette([
      black,
      white,
      oliveDrab,
      green
    ])
    
    this.setBrightness(3);
    this.fill(black);

    this.get(0).setRotation(75);
    this.get(1).setRotation(100);
    this.get(2).setRotation(80);
    this.get(3).setRotation(70);
  }

  update({ index }: ClockPayload) {
    const noiseAmount = lerp(1, 0, this.midi.fader, easeIn);
    const noiseSpeed = Math.floor(lerp(10, 3, this.midi.knobs.high, easeIn));

    (index % noiseSpeed === 0) && this.each(strip => {
      strip.fill(() => {
        return Math.random() > noiseAmount ? oliveDrab : green;
      });
    })
  }
}