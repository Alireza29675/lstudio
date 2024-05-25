import { Color } from "@lstudio/core";
import { OctaCoreMod } from "../common/OctaCoreMod";
import { black } from "../palettes/colors";

const colors = [
    new Color('#0000FF'),
    new Color('#0000FF'),
    new Color('#0000FF'),
    new Color('#0000FF'),
]

export class SimplePhotographyMod extends OctaCoreMod {
  init() {
    this.setPalette([black, ...colors])
    this.setBrightness(255);

    this.each((strip, i) => {
      strip.fill(colors[i % colors.length])
    });
  }

  update(): void {}
}