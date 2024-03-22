import { OctaCoreMod } from "./common/OctaCoreMod";
import { ClockPayload } from "../clock";
import midi from "../common/midimix";
import { State } from "../state";
import { black, tcsBlue, tcsRed, tcsYellow, white } from "./palettes/colors";

export class MetroMod extends OctaCoreMod {
  private shape = 'line' as 'line' | 'square';
  private program = 'animateBrightness' as 'strobe' | 'animateBrightness';

  init() {
    this.state.palette = [
      black,
      white,
      tcsRed,
      tcsYellow,
      tcsBlue
    ];
    this.state.strips.forEach(strip => strip.brightness = 255);

    this.state.strips[0].leds.fill(black)
    this.state.strips[1].leds.fill(black)
    this.state.strips[2].leds.fill(white)
    this.state.strips[3].leds.fill(tcsBlue)
  }

  activateMidiButtons() {
    // Formation shape
    if (midi.state.buttons[1][0]) {
      this.shape = 'line'
    }
    if (midi.state.buttons[1][1]) {
      this.shape = 'square'
    }

    // Program
    if (midi.state.buttons[0][0]) {
      this.program = 'animateBrightness'
    }
    if (midi.state.buttons[0][1]) {
      this.program = 'strobe'
    }
  }

  update({ index }: ClockPayload) {
    this.activateMidiButtons();
    this.formShape(this.state);

    if (this.program === 'animateBrightness') {
      this.animateBrightness(this.state, index);
    }
    if (this.program === 'strobe') {
      this.strobe(this.state, index);
    }
  }

  formShape = (state: State) => {
    if (this.shape === 'line') {
      state.strips[0].rotation = 77;
      state.strips[1].rotation = 90;
      state.strips[2].rotation = 88;
      state.strips[3].rotation = 86;
    }
    if (this.shape === 'square') {
      state.strips[0].rotation = 77 + 55;
      state.strips[1].rotation = 90 - 50;
      state.strips[2].rotation = 88 + 53;
      state.strips[3].rotation = 86 - 50;
    }
  }

  animateBrightness = (state: State, index: number) => {
    for (let i = 0; i < state.strips.length; i++) {
      const offset = i * Math.PI / 2;
      state.strips[i].brightness = Math.sin(index / 10 + offset) * 100 + 155;
    }
  }

  strobe = (state: State, index: number) => {
    for (let i = 0; i < state.strips.length; i++) {
      const offset = i * Math.PI / 2;
      state.strips[i].brightness = Math.sin(index + offset) * 200 + 55;
    }
  }
}