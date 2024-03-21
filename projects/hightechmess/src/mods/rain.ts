import { throttle } from "lodash";
import { OctaCoreMod } from "./common/OctaCoreMod";
import midi from "../common/midimix";
import { aqua, black, darkGrey, white } from "./palettes/colors";
import { Color } from "@lstudio/core";

function getRandomInt(min: number, max: number) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const DEFAULT_BRIGTHNESS = 20;

export class RainMod extends OctaCoreMod {
  private rainPatterns: Color[][] = Array(4).fill(0).map(() => Array(60).fill(black));
  private isLightning: boolean = false;

  init() {
    this.state.palette = [
      black,
      white,
      darkGrey,
      aqua,
    ]
    this.state.strips.forEach(strip => {
      strip.brightness = DEFAULT_BRIGTHNESS;
      strip.rotation = 20
    });
  }

  makeLightning = throttle(() => {
    const flashLightning = (remaining: number, minDuration: number) => {
      if (remaining <= 0) {
        this.isLightning = false;
        return;
      }
      this.isLightning = !this.isLightning;
  
      // Randomize the next state change within a range to simulate natural behavior
      const nextChangeInMs = this.isLightning ? getRandomInt(minDuration, minDuration + 50) : getRandomInt(40, 200);
  
      setTimeout(() => {
        flashLightning(remaining - 1, minDuration + 10);
      }, nextChangeInMs);
    };

    flashLightning(getRandomInt(3, 6) * 2, 0);
  }, 2000, { trailing: false });

  update() {
    const raininess = midi.state.faders[0] * 0.2;
    const shouldMakeLightning = midi.state.buttons[1][0] > 0;

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
}