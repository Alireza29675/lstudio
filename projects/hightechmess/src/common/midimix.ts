import { mkdirSync, readFileSync, writeFile } from "fs";
import { resolve } from "path";
import { throttle } from "lodash";
import { Input, MidiMessage, Output } from "midi";

enum MidiMixSignalCode {
  BUTTON_PRESS = 144,
  BUTTON_RELEASE = 128,
  KNOB = 176,
}

interface ControlPosition {
  row: number;
  col: number;
}

interface ControlIDs {
  knobs: number[][];
  buttons: number[][];
  comboButtons: number[];
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
  comboButtons: [2, 5, 8, 11, 14, 17, 20, 23],
  faders: [19, 23, 27, 31, 49, 53, 57, 61],
  masterFader: 62,
  bankLeftButton: 25,
  bankRightButton: 26,
  soloButton: 27,
};

type ControlState = {
  knobs: number[][];
  buttons: boolean[][];
  comboButtons: boolean[];
  faders: number[];
  masterFader: number;
  bankLeftButton: boolean;
  bankRightButton: boolean;
  soloButton: boolean;
};

const RECONNECT_INTERVAL_MS = 3000;

const cacheDirectory = resolve(__dirname, ".cache");
const cacheFile = resolve(cacheDirectory, "midi-state.json");

const currentCache = (() => {
  try {
    const content = readFileSync(cacheFile, "utf-8");
    return JSON.parse(content) as ControlState;
  } catch {
    return null;
  }
})();

class MidiMixController {
  private readonly midiName = "MIDI Mix";
  private readonly midiInput = new Input();
  private readonly midiOutput = new Output();

  private inputConnected = false;
  private outputConnected = false;
  private reconnectTimer: NodeJS.Timeout | null = null;

  public readonly state: ControlState;

  private comboButtonListeners: ((index: number, pressed: boolean) => void)[] = [];
  private buttonListeners: ((row: number, col: number, pressed: boolean) => void)[] = [];
  private soloButtonListeners: ((pressed: boolean) => void)[] = [];
  private bankRightButtonListeners: ((pressed: boolean) => void)[] = [];
  private bankLeftButtonListeners: ((pressed: boolean) => void)[] = [];

  constructor() {
    this.state = currentCache || this.initializeState();

    // Attach exactly one handler for the lifetime of the input object.
    this.midiInput.on("message", (_, message) => {
      const [signalCode, control, value] = message;
      this.updateState(signalCode, control, value);
    });

    this.connect();
  }

  private initializeState(): ControlState {
    return {
      knobs: Array.from({ length: 3 }, () => Array(8).fill(0)),
      buttons: Array.from({ length: 2 }, () => Array(8).fill(false)),
      comboButtons: Array(8).fill(false),
      faders: Array(8).fill(0),
      masterFader: 0,
      bankLeftButton: false,
      bankRightButton: false,
      soloButton: false,
    };
  }

  private findPort(device: Input | Output): number | null {
    for (let i = 0; i < device.getPortCount(); i++) {
      if (device.getPortName(i).includes(this.midiName)) {
        return i;
      }
    }

    return null;
  }

  private connectInput() {
    if (this.inputConnected) {
      return;
    }

    const port = this.findPort(this.midiInput);
    if (port === null) {
      return;
    }

    try {
      this.midiInput.openPort(port);
      this.inputConnected = true;
      console.log("🎛️ Connected to AKAI MIDImix Input");
    } catch (error) {
      console.error("Failed to open AKAI MIDImix Input:", error);
    }
  }

  private connectOutput() {
    if (this.outputConnected) {
      return;
    }

    const port = this.findPort(this.midiOutput);
    if (port === null) {
      return;
    }

    try {
      this.midiOutput.openPort(port);
      this.outputConnected = true;
      console.log("🎛️ Connected to AKAI MIDImix Output");
    } catch (error) {
      console.error("Failed to open AKAI MIDImix Output:", error);
    }
  }

  private connect() {
    this.connectInput();
    this.connectOutput();

    if (this.inputConnected && this.outputConnected) {
      if (this.reconnectTimer) {
        clearInterval(this.reconnectTimer);
        this.reconnectTimer = null;
      }
      return;
    }

    if (!this.reconnectTimer) {
      console.log("AKAI MIDImix not fully connected. Retrying...");
      this.reconnectTimer = setInterval(() => {
        this.connectInput();
        this.connectOutput();

        if (this.inputConnected && this.outputConnected && this.reconnectTimer) {
          clearInterval(this.reconnectTimer);
          this.reconnectTimer = null;
        }
      }, RECONNECT_INTERVAL_MS);
    }
  }

  private updateState(
    signalCode: MidiMixSignalCode,
    control: number,
    value: number
  ) {
    switch (signalCode) {
      case MidiMixSignalCode.BUTTON_PRESS:
      case MidiMixSignalCode.BUTTON_RELEASE:
        this.updateButtonState(
          control,
          signalCode === MidiMixSignalCode.BUTTON_PRESS
        );
        break;

      case MidiMixSignalCode.KNOB:
        this.updateKnobState(control, value);
        break;
    }

    this.saveState();
  }

  private findControlPosition(
    control: number,
    controlIDs: number[][]
  ): ControlPosition | null {
    for (let row = 0; row < controlIDs.length; row++) {
      const col = controlIDs[row].indexOf(control);
      if (col !== -1) {
        return { row, col };
      }
    }

    return null;
  }

  private updateButtonState(control: number, pressed: boolean) {
    const buttonPos = this.findControlPosition(control, CONTROL_IDs.buttons);
    if (buttonPos) {
      this.state.buttons[buttonPos.row][buttonPos.col] = pressed;
      this.buttonListeners.forEach((listener) =>
        listener(buttonPos.row, buttonPos.col, pressed)
      );
      return;
    }

    const comboIndex = CONTROL_IDs.comboButtons.indexOf(control);
    if (comboIndex !== -1) {
      this.state.comboButtons[comboIndex] = pressed;
      this.comboButtonListeners.forEach((listener) =>
        listener(comboIndex, pressed)
      );
      return;
    }

    switch (control) {
      case CONTROL_IDs.bankLeftButton:
        this.state.bankLeftButton = pressed;
        this.bankLeftButtonListeners.forEach((listener) => listener(pressed));
        break;

      case CONTROL_IDs.bankRightButton:
        this.state.bankRightButton = pressed;
        this.bankRightButtonListeners.forEach((listener) => listener(pressed));
        break;

      case CONTROL_IDs.soloButton:
        this.state.soloButton = pressed;
        this.soloButtonListeners.forEach((listener) => listener(pressed));
        break;
    }
  }

  private updateKnobState(control: number, value: number) {
    const normalizedValue = value / 127;

    const knobPos = this.findControlPosition(control, CONTROL_IDs.knobs);
    if (knobPos) {
      this.state.knobs[knobPos.row][knobPos.col] = normalizedValue;
      return;
    }

    if (control === CONTROL_IDs.masterFader) {
      this.state.masterFader = normalizedValue;
      return;
    }

    const faderIndex = CONTROL_IDs.faders.indexOf(control);
    if (faderIndex !== -1) {
      this.state.faders[faderIndex] = normalizedValue;
    }
  }

  private saveState = throttle(() => {
    try {
      const serialized = JSON.stringify(this.state);
      mkdirSync(cacheDirectory, { recursive: true });
      writeFile(cacheFile, serialized, () => {});
    } catch (error) {
      console.error("Failed to save MIDI state:", error);
    }
  }, 1000);

  private sendLightMessage(message: MidiMessage) {
    if (!this.outputConnected) {
      return;
    }

    try {
      this.midiOutput.sendMessage(message);
    } catch (error) {
      console.error("Failed to send MIDI light message:", error);
      this.outputConnected = false;
      this.connect();
    }
  }

  onComboButtonPressed(
    listener: (index: number, pressed: boolean) => void
  ) {
    this.comboButtonListeners.push(listener);
  }

  onButtonPressed(
    listener: (row: number, col: number, pressed: boolean) => void
  ) {
    this.buttonListeners.push(listener);
  }

  onSoloButtonPressed(listener: (pressed: boolean) => void) {
    this.soloButtonListeners.push(listener);
  }

  onBankRightButtonPressed(listener: (pressed: boolean) => void) {
    this.bankRightButtonListeners.push(listener);
  }

  onBankLeftButtonPressed(listener: (pressed: boolean) => void) {
    this.bankLeftButtonListeners.push(listener);
  }

  setButtonLight(row: number, col: number, on: boolean) {
    const control = CONTROL_IDs.buttons[row]?.[col];
    if (control === undefined) {
      return;
    }

    const velocity = on ? 127 : 0;
    this.sendLightMessage([
      MidiMixSignalCode.BUTTON_PRESS,
      control,
      velocity,
    ] as MidiMessage);
  }

  setComboButtonLight(index: number, on: boolean) {
    const control = CONTROL_IDs.comboButtons[index];
    if (control === undefined) {
      return;
    }

    const velocity = on ? 127 : 0;
    this.sendLightMessage([
      MidiMixSignalCode.BUTTON_PRESS,
      control,
      velocity,
    ] as MidiMessage);
  }

  setBankButton(type: "right" | "left", on: boolean) {
    const control =
      type === "right"
        ? CONTROL_IDs.bankRightButton
        : CONTROL_IDs.bankLeftButton;

    const velocity = on ? 127 : 0;
    this.sendLightMessage([
      MidiMixSignalCode.BUTTON_PRESS,
      control,
      velocity,
    ] as MidiMessage);
  }

  turnOffAllLights() {
    for (let row = 0; row < this.state.buttons.length; row++) {
      for (let col = 0; col < this.state.buttons[row].length; col++) {
        this.setButtonLight(row, col, false);
      }
    }

    for (let index = 0; index < this.state.comboButtons.length; index++) {
      this.setComboButtonLight(index, false);
    }
  }

  turnOnColumnLights(col: number) {
    this.turnOffAllLights();

    for (let row = 0; row < this.state.buttons.length; row++) {
      this.setButtonLight(row, col, true);
    }

    this.setComboButtonLight(col, true);
  }
}

const midi = new MidiMixController();

export default midi;
