import { throttle } from "lodash";
import { OctaCoreMod } from "./common/OctaCoreMod";
import { aqua, black, darkGrey, white } from "./palettes/colors";
import { Color } from "@lstudio/core";
import { randInt } from "./common/math";

const DEFAULT_BRIGTHNESS = 20;

export class RainMod extends OctaCoreMod {
  private rainPatterns: Color[][] = Array(4).fill(0).map(() => Array(60).fill(black));
  private isLightning: boolean = false;

  init() {
    this.setPalette([
      black,
      white,
      darkGrey,
      aqua,
    ])

    this.each(strip => {
      strip.setBrightness(DEFAULT_BRIGTHNESS);
      strip.setRotation(20)
    });
  }

  update() {
    const raininess = this.midi.fader * 0.2;
    const shouldMakeLightning = this.midi.buttons.mute;

    if (shouldMakeLightning) this.makeLightning();

    this.rainPatterns.forEach(pattern => {
      pattern.push(Math.random() < raininess ? darkGrey : black);
      pattern.shift();
    })

    this.state.strips.forEach((strip, index) => {
      strip.brightness = this.isLightning ? 255 : DEFAULT_BRIGTHNESS;
      strip.leds = this.rainPatterns[index].map(led => this.isLightning ? white : led);
    })
  }

  makeLightning = throttle(() => {
    const flashLightning = (remaining: number, minDuration: number) => {
      if (remaining <= 0) {
        this.isLightning = false;
        return;
      }
      this.isLightning = !this.isLightning;
  
      // Randomize the next state change within a range to simulate natural behavior
      const nextChangeInMs = this.isLightning ? randInt(minDuration, minDuration + 50) : randInt(40, 200);
  
      setTimeout(() => {
        flashLightning(remaining - 1, minDuration + 10);
      }, nextChangeInMs);
    };

    flashLightning(randInt(3, 6) * 2, 0);
  }, 2000, { trailing: false });
}