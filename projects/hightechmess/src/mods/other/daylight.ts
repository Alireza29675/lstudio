import { Color } from "@lstudio/core";
import { OctaCoreMod } from "../common/OctaCoreMod";
import { black } from "../palettes/colors";
import { ClockPayload } from "../../clock";

const sunriseColors = [
  new Color({ r: 1, g: 39, b: 172 }),
  new Color({ r: 15, g: 78, b: 111 }),
  new Color({ r: 182, g: 109, b: 45 }),
  new Color({ r: 254, g: 152, b: 22 }),
]

export class DaylightMod extends OctaCoreMod {
  init() {
    this.setPalette([black, ...sunriseColors])
    this.setBrightness(255);
  }

  update({ index }: ClockPayload) {


    this.each((strip, stripIndex) => {
      const totalLeds = strip.length;

      const offset = Math.floor(index / 600 * totalLeds) + (stripIndex * 60)

      strip.fill((i) => {
        const modifiedIndex = (i + offset) * 0.3
        const index = Math.floor(modifiedIndex / totalLeds * sunriseColors.length) % sunriseColors.length
        return sunriseColors[index]
      })
    });
  }
}