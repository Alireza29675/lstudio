import { OctaCoreMod } from "./common/OctaCoreMod";
import { black, aqua, white, navy, sapphire, indigo } from "./palettes/colors";
import { ClockPayload } from "../clock";
import { getNoise } from "./common/noise";
import { easeIn, lerp } from "./common/math";

export class SkyMod extends OctaCoreMod {
  init() {
    this.setPalette([
      black,
      white,
      aqua,
      navy,
      sapphire,
      indigo,
    ])
    
    this.setRotation(10);
    this.fill(aqua);
  }
  
  update({ index }: ClockPayload) {
    const brightness = lerp(0, 255, this.midi.masterFader, easeIn);

    this.setBrightness(brightness);

    this.each((strip, i) => {
      const noiseY = 0.5 * i;

      strip.fill((i) => {
        const noiseValue = getNoise(i / 60 + index / 50, noiseY) / 2 + 0.5;

        if (noiseValue < 0.1) {
          return black;
        } else if (noiseValue < 0.2) {
          return white;
        } else if (noiseValue < 0.3) {
          return aqua;
        } else if (noiseValue < 0.4) {
          return navy;
        } else if (noiseValue < 0.5) {
          return indigo;
        } else {
          return sapphire;
        }
      });
    });
  }
}