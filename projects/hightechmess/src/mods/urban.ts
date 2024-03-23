import { OctaCoreMod } from "./common/OctaCoreMod";
import { azure, black, blue, purple, sapphire, violet, white } from "./palettes/colors";
import { easeIn, lerp, randInt, randItem } from "./common/math";
import { getNoise } from "./common/noise";
import { ClockPayload } from "../clock";
import { throttle } from "lodash";

const LED_COUNT = 60;

export class UbranMod extends OctaCoreMod {
  private masks: [number, number][] = [
    [0, LED_COUNT -10],
    [0, LED_COUNT],
    [0, LED_COUNT],
    [0, LED_COUNT],
  ]

  private colors = [
    purple,
    white,
    purple,
    white,
  ]

  private rotations = [
    10,
    20,
    30,
    40,
  ]

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

    this.setBrightness(255);
  }

  randomizeRotationsAndColors = throttle(() => {
    this.rotations = this.rotations.map(() => randInt(0, 180));
    this.colors = this.colors.map(() => randItem([purple, white, azure, sapphire, violet]));
  }, 1000, { trailing: false });

  randomizeMasks(angle: number) {
    const speed = lerp(0.3, 1, this.midi.fader, easeIn);

    this.masks = this.masks.map((_, maskIndex) => {
      const start = (getNoise(angle * speed, maskIndex * 2) * 2 + 0.5) * LED_COUNT / 2;
      const end = start + (getNoise(angle * speed, maskIndex * 2 + 1) * 2 + 0.5) * LED_COUNT / 2;
      return [start, end];
    });
  }
  
  update({ angle }: ClockPayload) {
    const brightness = lerp(0, 255, this.midi.masterFader, easeIn);

    this.randomizeMasks(angle);

    if (this.midi.buttons.rec) {
      this.randomizeRotationsAndColors();
    }
    
    this.each((strip, stripIndex) => {
      const mask = this.masks[stripIndex];

      strip.fill((i) => {
        if (i < mask[0] || i > mask[1]) {
          return black;
        }
        return this.colors[stripIndex];
      });

      strip.setRotation(this.rotations[stripIndex]);

      const maskLength = mask[1] - mask[0];

      strip.setBrightness(brightness * (maskLength / LED_COUNT));
    });
  }
}