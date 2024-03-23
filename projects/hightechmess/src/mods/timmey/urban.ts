import { OctaCoreMod } from "../common/OctaCoreMod";
import { azure, black, blue, purple, sapphire, violet, white } from "../palettes/colors";
import { easeIn, lerp, randInt, randItem } from "../common/math";
import { getNoise } from "../common/noise";
import { ClockPayload } from "../../clock";
import { throttle } from "lodash";

const LED_COUNT = 60;

export class UbranMod extends OctaCoreMod {
  private masks: [number, number][] = [[0, 0], [0, 0], [0, 0], [0, 0]]
  private colors = [purple, white, purple, white]
  private brightnesses = [10, 10, 10, 10];

  init() {
    this.setPalette([
      black,
      white,
      purple,
      blue,
      sapphire,
      azure,
      violet
    ])

    this.setRotation(10);
    this.setBrightness(255);
  }

  randomizeColors = throttle(() => {
    this.colors = this.colors.map(() => randItem([purple, white, azure, sapphire, violet]));
  }, 1000, { trailing: false });

  randomizeMasks(angle: number) {
    const speed = lerp(0.1, 1, this.midi.knobs.high, easeIn);

    this.masks = this.masks.map((_, maskIndex) => {
      const start = (getNoise(angle * speed, maskIndex * 2) * 2 + 0.5) * LED_COUNT / 2;
      const end = start + (getNoise(angle * speed, maskIndex * 2 + 1) * 2 + 0.5) * LED_COUNT / 2;
      return [start, end];
    });
  }
  
  update({ angle, isKick }: ClockPayload) {
    if (isKick) this.kick();

    const brightnessRate = lerp(0, 1, this.midi.fader, easeIn);

    this.randomizeMasks(angle);

    if (this.midi.buttons.rec) {
      this.randomizeColors();
    }

    const leakage = lerp(0.5, 5, this.midi.knobs.low);
    this.brightnesses = this.brightnesses.map(brightness => Math.max(10, brightness - leakage));
    
    this.each((strip, stripIndex) => {
      const mask = this.masks[stripIndex];

      strip.fill((i) => {
        const ledIsOn = i < mask[0] || i > mask[1];
        return ledIsOn ? this.colors[stripIndex] : black;
      });

      this.each((strip, i) => strip.setBrightness(this.brightnesses[i] * brightnessRate));
    });
  }

  kick = throttle(() => {
    const indexToShine = randInt(0, 3);
    this.brightnesses[indexToShine] = 255;
  }, 100, { trailing: false });
}