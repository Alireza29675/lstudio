import { OctaCoreMod } from "./common/OctaCoreMod";
import { ClockPayload } from "../clock";
import { black, white } from "./palettes/colors";

export class AmbientMod extends OctaCoreMod {
  init() {
    this.setPalette([
      black,
      white,
    ])
    
    this.each(strip => {
      strip.setBrightness(255);
      strip.fill(black);
      strip.setRotation(0);
    });
  }

  update({ index }: ClockPayload) {
    console.log({ index });
  }
}