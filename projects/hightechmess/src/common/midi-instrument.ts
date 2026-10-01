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
    this.midiInput.on('message', (_, message) => this.handleMidiMessage(message));
    this.searchAndConnect();
    this.monitorConnection();
  }

  searchAndConnect() {
    if (this.isConnected) return;
    for (let i = 0; i < this.midiInput.getPortCount(); i++) {
      const name = this.midiInput.getPortName(i);
      if (this.debuggerEnabled) {
        console.log(`🎹 Found device: ${name}`);
      }
      if (this.listOfPossibleDevices.find((device) => name.toLowerCase().includes(device.toLowerCase()))) {
        try {
          this.midiInput.openPort(i);
        } catch {
          return;
        }
        this.isConnected = true;
        this.currentPortIndex = i;
        console.log(`🎹 Connected to instrument ${name}`);
        return;
      }
    }
  }

  handleMidiMessage(message: MidiMessage) {
    const [status, control, velocity] = message;
    const isPressed = (status & 0xf0) === PRESSED && velocity > 0;

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
    if (this.connectionRetryIntervalId) return;
    const checkDeviceConnected = () => {
      let devicePresent = false;
      for (let i = 0; i < this.midiInput.getPortCount(); i++) {
        const name = this.midiInput.getPortName(i).toLowerCase();
        if (this.listOfPossibleDevices.some(device => name.includes(device.toLowerCase()))) {
          devicePresent = true;
          break;
        }
      }

      if (!devicePresent) {
        if (this.isConnected) this.midiInput.closePort();
        this.isConnected = false;
        this.currentPortIndex = null;
        this.data.isKick = this.data.isSnare = this.data.isHiHat = false;
      }
      if (!this.isConnected) this.searchAndConnect();
    };
    this.connectionRetryIntervalId = setInterval(checkDeviceConnected, 3000);
  }

  retryConnection() {
    this.monitorConnection();
  }

  close() {
    if (this.connectionRetryIntervalId) clearInterval(this.connectionRetryIntervalId);
    this.connectionRetryIntervalId = null;
    this.midiInput.closePort();
    this.isConnected = false;
  }
}
