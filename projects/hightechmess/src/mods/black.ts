import { OctaCoreMod } from "./common/OctaCoreMod";
import { black, red, white, yellow } from "./palettes/colors";

export class BlackMod extends OctaCoreMod {
  init() {
    this.setPalette([
      black,
      white,
      red,
      yellow,
    ])
    this.each(strip => {
      strip.setBrightness(10);
      strip.fill(red);
      strip.setRotation(0)
    });
  }

  update() {
    this.fill(red);
    this.setRotation(this.midi.fader * 180);
  }
}