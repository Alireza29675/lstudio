import { Input } from 'midi';

enum ControlCode {
  Kick = 36,
  Snare = 38,
  HiHat = 42,
}

export const midiInData = {
  kick: false,
  snare: false
}

function connect() {
  const device = new Input();
  const portCount = device.getPortCount();
  for (let i = 0; i < portCount; i++) {
    console.log(device.getPortName(i))
    if (device.getPortName(i) === 'MC-707') {
      device.openPort(i);
      break;
    }
  }

  device.on('message', (_, message) => {
    const [signalCode, control, value] = message;
    
    if (control === ControlCode.Kick) {
      midiInData.kick = signalCode === 144;
    }

    if (control === ControlCode.Snare) {
      midiInData.snare = signalCode === 144;
    }

    if (signalCode === 128) console.log(control, value);
  });
}

connect();