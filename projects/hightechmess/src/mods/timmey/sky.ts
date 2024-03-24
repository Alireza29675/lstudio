import { OctaCoreMod } from "../common/OctaCoreMod";
import { black, aqua, white, navy, sapphire, indigo, zaffre, viridian } from "../palettes/colors";
import { ClockPayload } from "../../clock";
import { easeIn, lerp } from "../common/math";

export class SkyMod extends OctaCoreMod {
  init() {
    this.setPalette([
      black,
      white,
      aqua,
      navy,
      sapphire,
      indigo,
      zaffre,
      viridian
    ])
    
    this.setRotation(10);
    this.fill(aqua);
  }
  
  update({ index, angle }: ClockPayload) {
    const masterBrightness = lerp(0, 255, this.midi.fader, easeIn);
    const flickering = lerp(0, 0.5, this.midi.knobs.low, easeIn);

    this.each((strip, stripIndex) => {
      strip.fillNoise(this.state.palette, -index / ((stripIndex + 1) * 50), stripIndex / 30);
      const brightnessRate = Math.sin(angle + stripIndex) * flickering + (1 - flickering);
      strip.setBrightness(masterBrightness * brightnessRate)
    });
  }
}