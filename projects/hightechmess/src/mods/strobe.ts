import { throttle } from "lodash";
import { OctaCoreMod } from ".";
import { ClockPayload } from "../clock";
import midi from "../common/midi";
import { State } from "../state";
import { aqua, black, blue, white } from "./palettes/colors";

export class StrobeMod implements OctaCoreMod {
  private currentLEDIndex = 0;
  private gateIsOpen = false;

  init(state: State): State {
    state.palette = [
      black,
      white,
      blue,
      aqua,
    ]
    state.strips.forEach(strip => strip.brightness = 255);
    state.strips.forEach(strip => strip.leds.fill(3));

    return {
      ...state
    }
  }

  toggleGate = throttle(() => {
    this.gateIsOpen = !this.gateIsOpen;
  }, 1000, { trailing: false });

  update(state: State, { frameIndex }: ClockPayload): State {
    const rate = Math.floor(midi.state.knobs[0][0] * 10) + 1;
    
    if (midi.state.buttons[1][0] > 0) {
      this.toggleGate();
    }

    const gateRotation = this.gateIsOpen ? 20 : 0;

    state.strips[0].rotation = 45 - gateRotation
    state.strips[1].rotation = 60 - gateRotation
    state.strips[2].rotation = 120 + gateRotation;
    state.strips[3].rotation = 115 + gateRotation;

    if (frameIndex % rate === 0) {
      this.currentLEDIndex = Math.floor(Math.random() * state.strips.length);
    }

    state.strips.forEach((strip, i) => {
      const addedBrightness = i === this.currentLEDIndex ? 30 : -20;
      strip.brightness = Math.min(255, Math.max(0, strip.brightness + addedBrightness));
    });
    
    return {
      ...state
    }
  }
}