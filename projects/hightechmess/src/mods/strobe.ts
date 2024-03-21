import { throttle } from "lodash";
import { OctaCoreMod } from ".";
import midi from "../common/midimix";
import { State } from "../state";
import { black, tcsYellow, white } from "./palettes/colors";
// import { midiInData } from "../common/midi-instrument";
import { ClockPayload } from "../clock";

export class StrobeMod implements OctaCoreMod {
  private gateIsOpen = false;

  init(state: State): State {
    state.palette = [
      black,
      white,
      tcsYellow,
      tcsYellow,
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

  switchLED = throttle((state: State, isKick: boolean) => {
    const currentLEDIndex = Math.floor(Math.random() * 4);
    state.strips[currentLEDIndex].leds.fill(isKick ? 2 : 3);
    state.strips[currentLEDIndex].brightness = 255;
  }, 40, { trailing: false });

  update(state: State, { frameIndex }: ClockPayload): State {    
    if (midi.state.buttons[1][0] > 0) {
      this.toggleGate();
    }

    const gateRotation = this.gateIsOpen ? 20 : 0;

    state.strips[0].rotation = 45 - gateRotation
    state.strips[1].rotation = 60 - gateRotation
    state.strips[2].rotation = 120 + gateRotation;
    state.strips[3].rotation = 115 + gateRotation;

    if (frameIndex % 10 === 0) this.switchLED(state, true)
    if (frameIndex % 7 === 0) this.switchLED(state, false)

    state.strips.forEach((strip) => {
      strip.brightness = Math.min(255, Math.max(0, strip.brightness - 5));
    });
    
    return {
      ...state
    }
  }
}