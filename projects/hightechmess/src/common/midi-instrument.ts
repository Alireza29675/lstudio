import { Input, MidiMessage } from 'midi';

const PRESSED = 144;

enum ControlCode {
  Kick = 36,
  Snare = 38,
  HiHat = 42,
}

export class ExternalMidiInstrument {
  isConnected = false;
  midiInput: Input;
  connectionRetryIntervalId: NodeJS.Timeout | null = null;
  currentPortIndex: number | null = null;

  readonly data = {
    isKick: false,
    isSnare: false,
    isHiHat: false,
  }

  constructor(readonly listOfPossibleDevices: string[], readonly debuggerEnabled = false) {
    this.midiInput = new Input();
    this.searchAndConnect();
    this.monitorConnection();
  }

  searchAndConnect() {
    for (let i = 0; i < this.midiInput.getPortCount(); i++) {
      const name = this.midiInput.getPortName(i);
      if (this.debuggerEnabled) {
        console.log(`🎹 Found device: ${name}`);
      }
      if (this.listOfPossibleDevices.find((device) => name.toLowerCase().includes(device.toLowerCase()))) {
        this.midiInput.openPort(i);
        this.isConnected = true;
        this.currentPortIndex = i;
        console.log(`🎹 Connected to instrument ${name}`);
        this.midiInput.on('message', (_, message) => this.handleMidiMessage(message));
        return;
      }
    }
    this.retryConnection();
  }

  handleMidiMessage(message: MidiMessage) {
    const [status, control] = message;
    const isPressed = status === PRESSED;

    switch(control) {
      case ControlCode.Kick:
        this.data.isKick = isPressed;
        break;
      case ControlCode.Snare:
        this.data.isSnare = isPressed;
        break;
      case ControlCode.HiHat:
        this.data.isHiHat = isPressed;
        break;
    }
  }

  monitorConnection() {
    const checkDeviceConnected = () => {
      let devicePresent = false;
      for (let i = 0; i < this.midiInput.getPortCount(); i++) {
        if (this.listOfPossibleDevices.includes(this.midiInput.getPortName(i))) {
          devicePresent = true;
          break;
        }
      }

      if (!devicePresent) {
        this.isConnected = false;
        this.retryConnection();
      }
    };
    setInterval(checkDeviceConnected, 3000);
  }

  retryConnection() {
    if (this.connectionRetryIntervalId) {
      clearInterval(this.connectionRetryIntervalId);
    }
    this.connectionRetryIntervalId = setInterval(() => {
      if (!this.isConnected) {
        this.searchAndConnect();
      }
    }, 3000);
  }
}
