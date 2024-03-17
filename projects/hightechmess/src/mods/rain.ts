import { throttle } from "lodash";
import { OctaCoreMod } from ".";
import midi from "../common/midi";
import { State } from "../state";
import { aqua, black, darkGrey, white } from "./palettes/colors";

function getRandomInt(min: number, max: number) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export class RainMod implements OctaCoreMod {
  private rainPatterns: number[][] = Array(4).fill(0).map(() => Array(60).fill(0));
  private isLightning: boolean = false;

  init(state: State): State {
    state.palette = [
      black,
      white,
      darkGrey,
      aqua,
    ]
    state.strips.forEach(strip => strip.rotation = 20);

    return {
      ...state
    }
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

  update(state: State) {
    const raininess = midi.state.faders[0] * 0.2;
    const shouldMakeLightning = midi.state.buttons[1][0] > 0;

    if (shouldMakeLightning) this.makeLightning();

    this.rainPatterns.forEach(pattern => {
      pattern.push(Math.random() < raininess ? 2 : 0);
      pattern.shift();
    })

    state.strips.forEach((strip, index) => {
      strip.leds = this.rainPatterns[index].map(led => this.isLightning ? 1 : led);
    })

    return {
      ...state
    };
  }
}