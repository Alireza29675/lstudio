import { OctaCoreMod } from "../common/OctaCoreMod";
import { black, sepia, sun, tangerine, white } from "../palettes/colors";
import { easeIn, lerp, randBool } from "../common/math";
import { ClockPayload } from "../../clock";
import { throttle } from "lodash";

export class AmbientMod extends OctaCoreMod {
  private color = sepia;

  init() {
    this.setPalette([
      black,
      white,
      sepia,
      sun,
      tangerine
    ])
    
    this.setRotation(10);
    this.fill(sepia);
  }

  private switchColor = throttle(() => {
    const colors = [sepia, sun, tangerine]
    const currentIndex = colors.indexOf(this.color);
    this.color = colors[(currentIndex + 1) % colors.length];
    console.log('switching color to', this.color.toString());
  }, 1000, { trailing: false });
  
  update({ angle }: ClockPayload) {
    const masterBrightness = lerp(0.7, 1, this.midi.fader, easeIn);
    const amplitude = lerp(0, 200, this.midi.knobs.high, easeIn);
    const speed = lerp(0.5, 5, this.midi.knobs.mid, easeIn);
    const divergency = lerp(Math.PI / 2, 0, this.midi.knobs.low);

    const noisiness = lerp(1, 0, this.midi.fader);

    if (this.midi.buttons.mute) {
      this.switchColor();
    }
    
    this.each((strip, i) => {
      const brightness = Math.sin((i * divergency) + (angle * speed)) * amplitude;

      strip.fill(() => randBool(noisiness) ? this.color : black);

      strip.setBrightness(masterBrightness * (brightness + amplitude * 1.5));
    });
  }
}