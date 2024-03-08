import { Input, Output } from 'midi';

enum MidiMixSignalCode {
  BUTTON_PRESS = 144,
  BUTTON_RELEASE = 128,
  KNOB = 176,
}

interface ControlPosition {
  row: number;
  col: number;
}

const MAX_CONNECTION_RETRIES = Infinity;

interface ControlIDs {
  knobs: number[][];
  buttons: number[][];
  soloButtons: number[];
  faders: number[];
  masterFader: number;
  bankLeftButton: number;
  bankRightButton: number;
  soloButton: number;
}

const CONTROL_IDs: ControlIDs = {
  knobs: [
    [16, 20, 24, 28, 46, 50, 54, 58],
    [17, 21, 25, 29, 47, 51, 55, 59],
    [18, 22, 26, 30, 48, 52, 56, 60],
  ],
  buttons: [
    [1, 4, 7, 10, 13, 16, 19, 22],
    [3, 6, 9, 12, 15, 18, 21, 24],
  ],
  soloButtons: [2, 5, 8, 11, 14, 17, 20, 23],
  faders: [19, 23, 27, 31, 49, 53, 57, 61],
  masterFader: 62,
  bankLeftButton: 25,
  bankRightButton: 26,
  soloButton: 27,
};

type ControlState = {
  knobs: number[][];
  buttons: number[][];
  soloButtons: number[];
  faders: number[];
  masterFader: number;
  bankLeftButton: number;
  bankRightButton: number;
  soloButton: number;
};

class MidiMixController {
  private midiName: string = 'MIDI Mix';
  private midiInput: Input = new Input();
  private midiOutput: Output = new Output();
  private isConnected: boolean = false;
  public readonly state: ControlState;

  constructor() {
    this.state = this.initializeState();
    this.connect();
  }

  private initializeState(): ControlState {
    return {
      knobs: Array(3).fill(null).map(() => Array(8).fill(0)),
      buttons: Array(2).fill(null).map(() => Array(8).fill(0)),
      soloButtons: Array(8).fill(0),
      faders: Array(8).fill(0),
      masterFader: 0,
      bankLeftButton: 0,
      bankRightButton: 0,
      soloButton: 0,
    };
  }

  private connect(retryCount = 0) {
    // Optimized to reduce redundancy and improve readability
    this.tryConnectDevice(this.midiInput, 'Input');
    this.tryConnectDevice(this.midiOutput, 'Output');

    if (!this.isConnected && retryCount < MAX_CONNECTION_RETRIES) {
      console.log('AKAI MidiMix not found. Retrying...');
      setTimeout(() => this.connect(retryCount + 1), 3000);
    }

    this.midiInput.on('message', (_, message) => {
      const [signalCode, control, value] = message;
      this.updateState(signalCode, control, value);
    });
  }

  private tryConnectDevice(device: Input | Output, type: string) {
    const portCount = device.getPortCount();
    for (let i = 0; i < portCount; i++) {
      if (device.getPortName(i).includes(this.midiName)) {
        device.openPort(i);
        this.isConnected = true;
        console.log(`Connected to AKAI MidiMix ${type}`);
        break;
      }
    }
  }

  private updateState(signalCode: MidiMixSignalCode, control: number, value: number) {
    switch (signalCode) {
      case MidiMixSignalCode.BUTTON_PRESS:
      case MidiMixSignalCode.BUTTON_RELEASE:
        this.updateButtonState(control, signalCode === MidiMixSignalCode.BUTTON_PRESS ? 1 : 0);
        break;
      case MidiMixSignalCode.KNOB:
        this.updateKnobState(control, value);
        break;
    }
  }


  private findControlPosition(control: number, controlIDs: number[][]): ControlPosition | null {
    for (let row = 0; row < controlIDs.length; row++) {
      const col = controlIDs[row].indexOf(control);
      if (col !== -1) {
        return { row, col };
      }
    }
    return null;
  }

  private updateButtonState(control: number, state: number) {
    let updated = false;

    // Update regular buttons
    const buttonPos = this.findControlPosition(control, CONTROL_IDs.buttons);
    if (buttonPos) {
      this.state.buttons[buttonPos.row][buttonPos.col] = state;
      updated = true;
    }

    // Update solo buttons
    if (!updated) {
      const soloIndex = CONTROL_IDs.soloButtons.indexOf(control);
      if (soloIndex !== -1) {
        this.state.soloButtons[soloIndex] = state;
        updated = true;
      }
    }

    // Update special buttons
    if (!updated) {
      switch (control) {
        case CONTROL_IDs.bankLeftButton:
          this.state.bankLeftButton = state;
          break;
        case CONTROL_IDs.bankRightButton:
          this.state.bankRightButton = state;
          break;
        case CONTROL_IDs.soloButton:
          this.state.soloButton = state;
          break;
      }
    }
  }

  private updateKnobState(control: number, value: number) {
    const normalizedValue = value / 127;

    // Update knobs
    const knobPos = this.findControlPosition(control, CONTROL_IDs.knobs);
    if (knobPos) {
      this.state.knobs[knobPos.row][knobPos.col] = normalizedValue;
      return;
    }

    // Update master fader
    if (control === CONTROL_IDs.masterFader) {
      this.state.masterFader = normalizedValue;
      return;
    }

    // Update faders
    const faderIndex = CONTROL_IDs.faders.indexOf(control);
    if (faderIndex !== -1) {
      this.state.faders[faderIndex] = normalizedValue;
    }
  }
}

const midi = new MidiMixController();

export default midi;
