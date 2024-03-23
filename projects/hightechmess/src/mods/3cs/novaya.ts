import { ClockPayload } from "../../clock";
import { OctaCoreMod } from "../common/OctaCoreMod";
import { black, pink, white, sapphire, cyan, yellow } from "../palettes/colors";

export class NovayaMod extends OctaCoreMod {
  init() {
    this.setPalette([
      black,
      white,
      sapphire,
      cyan,
      yellow,
    ])
    
    this.setBrightness(255);
    this.fill(pink);

    this.setRotation(0);
  }

  update({ index }: ClockPayload) {
    this.each((strip, stripIndex) => {
      // Sky
      strip.fillNoise([
        sapphire,
        cyan
      ], stripIndex / 10 - index / 50, stripIndex);
    });
  }
}