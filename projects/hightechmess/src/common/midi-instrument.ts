import { Input, MidiMessage } from 'midi';

const PRESSED = 144;

enum ControlCode {
  Kick = 36,
  Snare = 38,
  HiHat = 42,
}

export const midiInData = {
  kick: false,
  snare: false
}

const processMidiMessage = ([signalCode, midiControlCode]: MidiMessage) => {
  return {
    getControlState: (controlCode: ControlCode,) => {
      return signalCode === PRESSED && midiControlCode === controlCode;
    }
  }
}

export function connectToMidiDevice(partialName: string) {
  const device = new Input();
  const portCount = device.getPortCount();
  for (let i = 0; i < portCount; i++) {
    if (device.getPortName(i).toLowerCase().includes(partialName.toLowerCase())) {
      device.openPort(i);
      break;
    }
  }

  device.on('message', (_, message) => {
    const { getControlState } = processMidiMessage(message);
    
    midiInData.kick = getControlState(ControlCode.Kick)
    midiInData.snare = getControlState(ControlCode.Snare)
  });
}
