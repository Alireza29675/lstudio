import { OctaCoreMod } from ".";
import { ClockPayload } from "../clock";
import midi from "../common/midi";
import { State } from "../state";
import { black, tcsBlue, tcsRed, tcsYellow, white } from "./palettes/colors";

export class MetroMod implements OctaCoreMod {
  private shape = 'line' as 'line' | 'square';
  private program = 'animateBrightness' as 'strobe' | 'animateBrightness';

  init(state: State): State {
    state.palette = [
      black,
      white,
      tcsRed,
      tcsYellow,
      tcsBlue
    ];
    state.strips.forEach(strip => strip.brightness = 255);

    state.strips[0].leds.fill(4)
    state.strips[1].leds.fill(1)
    state.strips[2].leds.fill(2)
    state.strips[3].leds.fill(3)

    return {
      ...state
    }
  }

  activateMidiButtons() {
    // Formation shape
    if (midi.state.buttons[1][0] > 0) {
      this.shape = 'line'
    }
    if (midi.state.buttons[1][1] > 0) {
      this.shape = 'square'
    }

    // Program
    if (midi.state.buttons[0][0] > 0) {
      this.program = 'animateBrightness'
    }
    if (midi.state.buttons[0][1] > 0) {
      this.program = 'strobe'
    }
  }

  update(state: State, { frameIndex }: ClockPayload): State {
    this.activateMidiButtons();
    this.formShape(state);

    if (this.program === 'animateBrightness') {
      this.animateBrightness(state, frameIndex);
    }
    if (this.program === 'strobe') {
      this.strobe(state, frameIndex);
    }

    return {
      ...state
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

  animateBrightness = (state: State, frameIndex: number) => {
    for (let i = 0; i < state.strips.length; i++) {
      const offset = i * Math.PI / 2;
      state.strips[i].brightness = Math.sin(frameIndex / 10 + offset) * 100 + 155;
    }
  }

  strobe = (state: State, frameIndex: number) => {
    for (let i = 0; i < state.strips.length; i++) {
      const offset = i * Math.PI / 2;
      state.strips[i].brightness = Math.sin(frameIndex + offset) * 200 + 55;
    }
  }
}