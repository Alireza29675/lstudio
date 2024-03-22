import { OctaCoreMod } from "./common/OctaCoreMod";
import { ClockPayload } from "../clock";
import { black, white, yellow } from "./palettes/colors";

export class BlackMod extends OctaCoreMod {
  init() {
    this.setPalette([
      black,
      white,
      yellow,
    ])
    this.each(strip => {
      strip.setBrightness(10);
      strip.fill(white);
      strip.setRotation(0)
    });
  }

  update({ index }: ClockPayload) {
    this.fill(white);
    this.get(3).setRangeColor(index % 60, index % 60 + 10, yellow);
    this.get(1).setRangeColor(index + 10 % 60, index + 10 % 60 + 40, yellow);
  }
}