import { Input, MidiMessage, Output } from 'midi';
import { mkdirSync, readFileSync, writeFile } from 'fs';
import { resolve } from 'path';
import { throttle } from 'lodash';
import { performance } from 'perf_hooks';

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

// SEND ALL transmits a snapshot, not a dedicated note. Require every known
// continuous control within one short burst; ordinary knob moves cannot trigger it.
const snapshotControls = new Set([...CONTROL_IDs.knobs.flat(), ...CONTROL_IDs.faders, CONTROL_IDs.masterFader]);

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

const cacheDirectory = resolve(__dirname, '.cache');
const cacheFile = resolve(cacheDirectory, 'midi-state.json');
const currentCache = (() => {
  try {
    const content = readFileSync(cacheFile, 'utf-8');
    return JSON.parse(content) as ControlState;
  } catch (e) {
    return null;
  }
})()

export class MidiMixController {
  private midiName: string = 'MIDI Mix';
  private midiInput: Input = new Input();
  private midiOutput: Output = new Output();
  private inputConnected = false;
  private outputConnected = false;
  private connectionTimer: NodeJS.Timeout;
  private desiredLights = new Map<number, MidiMessage>();
  public readonly state: ControlState;

  private comboButtonListeners: ((index: number, pressed: boolean) => void)[] = [];
  private buttonListeners: ((row: number, col: number, pressed: boolean) => void)[] = [];
  private soloButtonListeners: ((pressed: boolean) => void)[] = [];
  private bankRightButtonListeners: ((pressed: boolean) => void)[] = [];
  private bankLeftButtonListeners: ((pressed: boolean) => void)[] = [];
  private sendAllListeners: (() => void)[] = [];
  private snapshotSeen = new Map<number, number>();
  private snapshotTimer?: NodeJS.Timeout;

  get connected(): boolean { return this.inputConnected; }

  constructor() {
    this.state = currentCache || this.initializeState();
    this.midiInput.on('message', (_, message) => {
      const [signalCode, control, value] = message;
      this.updateState(signalCode, control, value);
    });
    this.connect();
    this.connectionTimer = setInterval(() => this.connect(), 3000);
  }

  private initializeState(): ControlState {
    return {
      knobs: Array(3).fill(null).map(() => Array(8).fill(0)),
      buttons: Array(2).fill(null).map(() => Array(8).fill(false)),
      comboButtons: Array(8).fill(false),
      faders: Array(8).fill(0),
      masterFader: 0,
      bankLeftButton: false,
      bankRightButton: false,
      soloButton: false,
    };
  }

  private connect() {
    const wasInputConnected = this.inputConnected;
    this.inputConnected = this.tryConnectDevice(this.midiInput, 'Input', this.inputConnected);
    if (this.inputConnected !== wasInputConnected) this.snapshotSeen.clear();
    const wasOutputConnected = this.outputConnected;
    this.outputConnected = this.tryConnectDevice(this.midiOutput, 'Output', this.outputConnected);
    if (this.outputConnected && !wasOutputConnected) {
      this.desiredLights.forEach(message => this.sendLight(message));
    }
  }

  private tryConnectDevice(device: Input | Output, type: string, connected: boolean): boolean {
    try {
      for (let i = 0; i < device.getPortCount(); i++) {
        if (device.getPortName(i).toLowerCase().includes(this.midiName.toLowerCase())) {
          if (!connected) {
            device.openPort(i);
            console.log(`🎛️ Connected to AKAI MidiMix ${type}`);
          }
          return true;
        }
      }
    } catch {
      console.error(`Could not connect to AKAI MidiMix ${type}; retrying.`);
    }
    if (connected) device.closePort();
    return false;
  }

  close() {
    clearInterval(this.connectionTimer);
    clearTimeout(this.snapshotTimer);
    this.saveState.cancel();
    this.midiInput.closePort();
    this.midiOutput.closePort();
    this.inputConnected = this.outputConnected = false;
  }

  private sendLight(message: MidiMessage) {
    this.desiredLights.set(message[1], message);
    if (!this.outputConnected) return;
    try {
      this.midiOutput.sendMessage(message);
    } catch {
      this.midiOutput.closePort();
      this.outputConnected = false;
    }
  }

  private updateState(signalCode: MidiMixSignalCode, control: number, value: number) {
    switch (signalCode) {
      case MidiMixSignalCode.BUTTON_PRESS:
      case MidiMixSignalCode.BUTTON_RELEASE:
        this.updateButtonState(control, signalCode === MidiMixSignalCode.BUTTON_PRESS && value > 0);
        break;
      case MidiMixSignalCode.KNOB:
        this.updateKnobState(control, value);
        this.trackSnapshot(control);
        break;
    }

    this.saveState();
  }


  private trackSnapshot(control: number) {
    if (!snapshotControls.has(control)) return;
    const now = performance.now();
    for (const [id, seenAt] of this.snapshotSeen) {
      if (now - seenAt > 250) this.snapshotSeen.delete(id);
    }
    this.snapshotSeen.set(control, now);
    clearTimeout(this.snapshotTimer);
    if (this.snapshotSeen.size === snapshotControls.size) {
      // Let the burst finish so a recent ordinary move cannot make us emit
      // before that same control's final snapshot value arrives.
      this.snapshotTimer = setTimeout(() => {
        if (!this.inputConnected || this.snapshotSeen.size !== snapshotControls.size) return;
        this.snapshotSeen.clear();
        this.sendAllListeners.forEach(listener => listener());
      }, 8);
    }
  }

  onSendAll(listener: () => void) { this.sendAllListeners.push(listener); }

  private findControlPosition(control: number, controlIDs: number[][]): ControlPosition | null {
    for (let row = 0; row < controlIDs.length; row++) {
      const col = controlIDs[row].indexOf(control);
      if (col !== -1) {
        return { row, col };
      }
    }
    return null;
  }

  private updateButtonState(control: number, pressed: boolean) {
    // Update regular buttons
    const buttonPos = this.findControlPosition(control, CONTROL_IDs.buttons);
    if (buttonPos) {
      this.state.buttons[buttonPos.row][buttonPos.col] = pressed;
      this.buttonListeners.forEach(listener => listener(buttonPos.row, buttonPos.col, pressed));
      return;
    }

    // Update solo buttons
    const comboIndex = CONTROL_IDs.comboButtons.indexOf(control);
    if (comboIndex !== -1) {
      this.state.comboButtons[comboIndex] = pressed;
      this.comboButtonListeners.forEach(listener => listener(comboIndex, pressed));
      return;
    }

    // Update special buttons
    switch (control) {
      case CONTROL_IDs.bankLeftButton:
        this.bankLeftButtonListeners.forEach(listener => listener(pressed));
        this.state.bankLeftButton = pressed;
        break;
      case CONTROL_IDs.bankRightButton:
        this.bankRightButtonListeners.forEach(listener => listener(pressed));
        this.state.bankRightButton = pressed;
        break;
      case CONTROL_IDs.soloButton:
        this.soloButtonListeners.forEach(listener => listener(pressed));
        this.state.soloButton = pressed;
        break;
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

  private saveState = throttle(() => {
    try {
      const serialized = JSON.stringify(this.state);
      mkdirSync(cacheDirectory, { recursive: true });
      writeFile(cacheFile, serialized, () => {});
    } catch (e) {
      console.error('Failed to save midi state:', e);
    }
  }, 1000);

  onComboButtonPressed(listener: (index: number, pressed: boolean) => void) {
    this.comboButtonListeners.push(listener);
  }

  onButtonPressed(listener: (row: number, col: number, pressed: boolean) => void) {
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
    const velocity = on ? 127 : 0; // Full velocity for on, 0 for off
    const control = CONTROL_IDs.buttons[row][col];
    const noteOnMessage = [MidiMixSignalCode.BUTTON_PRESS, control, velocity] as MidiMessage
    this.sendLight(noteOnMessage);
  }

  setComboButtonLight(index: number, on: boolean) {
    const velocity = on ? 127 : 0;
    const control = CONTROL_IDs.comboButtons[index];
    const noteOnMessage = [MidiMixSignalCode.BUTTON_PRESS, control, velocity] as MidiMessage
    this.sendLight(noteOnMessage);
  }

  setBankButton(type: 'right' | 'left', on: boolean) {
    const velocity = on ? 127 : 0;
    const control = type === 'right' ? CONTROL_IDs.bankRightButton : CONTROL_IDs.bankLeftButton;
    const noteOnMessage = [MidiMixSignalCode.BUTTON_PRESS, control, velocity] as MidiMessage
    this.sendLight(noteOnMessage);
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
