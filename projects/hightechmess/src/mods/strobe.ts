import { throttle } from "lodash";
import { OctaCoreMod } from "./common/OctaCoreMod";
import midi from "../common/midimix";
import { State } from "../state";
import { black, tcsBlue, white } from "./palettes/colors";
// import { midiInData } from "../common/midi-instrument";
import { ClockPayload } from "../clock";

export class StrobeMod extends OctaCoreMod {
  private gateIsOpen = false;

  init() {
    this.state.palette = [
      black,
      white,
      tcsBlue,
    ]
    this.state.strips.forEach(strip => strip.brightness = 255);
    this.state.strips.forEach(strip => strip.leds.fill(black));
  }

  toggleGate = throttle(() => {
    this.gateIsOpen = !this.gateIsOpen;
  }, 1000, { trailing: false });

  switchLED = throttle((state: State, isKick: boolean) => {
    const currentLEDIndex = Math.floor(Math.random() * 4);
    state.strips[currentLEDIndex].leds.fill(isKick ? tcsBlue : white);
    state.strips[currentLEDIndex].brightness = 255;
  }, 40, { trailing: false });

  update({ frameIndex }: ClockPayload) {    
    if (midi.state.buttons[1][0] > 0) {
      this.toggleGate();
    }

    const gateRotation = this.gateIsOpen ? 20 : 0;

    this.state.strips[0].rotation = 45 - gateRotation
    this.state.strips[1].rotation = 60 - gateRotation
    this.state.strips[2].rotation = 120 + gateRotation;
    this.state.strips[3].rotation = 115 + gateRotation;

    if (frameIndex % 10 === 0) this.switchLED(this.state, true)
    if (frameIndex % 7 === 0) this.switchLED(this.state, false)

    this.state.strips.forEach((strip) => {
      strip.brightness = Math.min(255, Math.max(0, strip.brightness - 5)) * midi.state.masterFader;
    });
  }
}