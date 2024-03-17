import { Input } from 'midi';

enum ControlCode {
  Kick = 36,
  Snare = 38,
  HiHat = 42,
}

export const midiInData = {
  kick: false,
}

function connect() {
  const device = new Input();
  const portCount = device.getPortCount();
  for (let i = 0; i < portCount; i++) {
    if (device.getPortName(i).includes('Rubix')) {
      device.openPort(i);
      break;
    }
  }

  device.on('message', (_, message) => {
    const [signalCode, control, value] = message;
    
    if (control === ControlCode.Kick) {
      midiInData.kick = signalCode === 144;
    }

    console.log(signalCode, control, value);
  });
}

connect();