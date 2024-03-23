import { OctaCoreMod } from "./common/OctaCoreMod";
import { black, aqua, white, navy, sapphire, indigo } from "./palettes/colors";
import { ClockPayload } from "../clock";
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
      strip.fillNoise(this.state.palette, index / 50, i / 50);
    });
  }
}