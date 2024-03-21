import { OctaCoreMod } from "./common/OctaCoreMod";
import { ClockPayload } from "../clock";
import { black, red, white } from "./palettes/colors";

export class BlackMod extends OctaCoreMod {
  init() {
    this.setPalette([
      black,
      white,
      red,
    ])
    this.each(strip => {
      strip.setBrightness(10);
      strip.fill(white);
      strip.setRotation(0)
    });
  }

  update({ frameIndex }: ClockPayload) {
    this.get(0).setPixelColor(frameIndex % 30, black);
  }
}