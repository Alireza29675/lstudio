import { OctaCoreMod } from "./common/OctaCoreMod";
import { black, sepia, white } from "./palettes/colors";
import { easeIn, lerp, randBool } from "./common/math";
import { ClockPayload } from "../clock";

export class AmbientMod extends OctaCoreMod {
  init() {
    this.setPalette([
      black,
      white,
      sepia,
    ])
    
    this.setRotation(10);
    this.fill(sepia);
  }
  
  update({ angle }: ClockPayload) {
    const masterBrightness = lerp(0, 1, this.midi.fader, easeIn);
    const amplitude = lerp(0, 100, this.midi.knobs.high, easeIn);
    const speed = lerp(0, 5, this.midi.knobs.mid, easeIn);
    const divergency = lerp(0, Math.PI / 2, this.midi.knobs.low);

    const noisiness = lerp(0, 1, this.midi.masterFader);
    
    this.each((strip, i) => {
      const brightness = Math.sin((i * divergency) + (angle * speed)) * amplitude + amplitude;

      strip.fill(() => randBool(noisiness) ? sepia : black);

      strip.setBrightness(masterBrightness * (brightness + amplitude * 0.5));
    });
  }
}