export interface Program {
  bpm: number;
  effect: number;
  brightness: number;
  duty: number;
  division: number;
  dash: number;
  motion: number;
  seed: number;
  colors: string[];
  steps: number[];
}

export const defaultProgram: Program = {
  bpm: 128, effect: 1, brightness: 64, duty: 70, division: 2,
  dash: 4, motion: 4, seed: 12345,
  colors: ['#cbfa72', '#80dbf4', '#f26aaf', '#ffffff'],
  steps: [1, 0, 1, 4, 0, 2, 0, 1, 1, 0, 4, 0, 3, 0, 1, 4],
};

export function validateProgram(value: unknown): Program {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Expected a pattern object');
  const data = value as Record<string, unknown>;
  const keys = Object.keys(defaultProgram);
  if (Object.keys(data).length !== keys.length || Object.keys(data).some(key => !keys.includes(key))) {
    throw new Error('Pattern must contain exactly the supported fields');
  }
  const integer = (key: string, min: number, max: number) => {
    const n = data[key];
    if (typeof n !== 'number' || !Number.isInteger(n) || n < min || n > max) {
      throw new Error(`${key} must be an integer from ${min} to ${max}`);
    }
    return n;
  };
  const bpm = data.bpm;
  if (typeof bpm !== 'number' || !Number.isFinite(bpm) || bpm < 40 || bpm > 240 || Math.abs(bpm * 100 - Math.round(bpm * 100)) > 1e-6) {
    throw new Error('bpm must be 40–240 with at most two decimal places');
  }
  const division = integer('division', 1, 4);
  if (![1, 2, 4].includes(division)) throw new Error('division must be 1, 2 or 4');
  if (!Array.isArray(data.colors) || data.colors.length !== 4 || data.colors.some(color => typeof color !== 'string' || !/^#[\da-f]{6}$/i.test(color))) {
    throw new Error('colors must contain four #RRGGBB colors');
  }
  if (!Array.isArray(data.steps) || data.steps.length !== 16 || data.steps.some(step => !Number.isInteger(step) || step < 0 || step > 4)) {
    throw new Error('steps must contain sixteen integers from 0 to 4');
  }
  return {
    bpm, division, effect: integer('effect', 0, 5), brightness: integer('brightness', 0, 255),
    duty: integer('duty', 1, 100), dash: integer('dash', 1, 15), motion: integer('motion', 1, 16),
    seed: integer('seed', 0, 0xffffffff), colors: data.colors.map(color => (color as string).toLowerCase()),
    steps: [...data.steps] as number[],
  };
}

export function encodeStage(program: Program, revision: number): Buffer {
  const p = validateProgram(program);
  const packet = Buffer.alloc(46);
  packet[0] = 32;
  packet[1] = 1;
  packet.writeUInt32LE(revision >>> 0, 2);
  packet.writeUInt16LE(Math.round(p.bpm * 100), 6);
  [p.effect, p.brightness, p.duty, p.division, p.dash, p.motion].forEach((value, i) => packet[8 + i] = value);
  packet.writeUInt32LE(p.seed, 14);
  p.colors.forEach((color, i) => Buffer.from(color.slice(1), 'hex').copy(packet, 18 + i * 3));
  p.steps.forEach((step, i) => packet[30 + i] = step);
  return packet;
}

export function encodeCommit(revision: number, deviceTime: number): Buffer {
  const packet = Buffer.alloc(9);
  packet[0] = 33;
  packet.writeUInt32LE(revision >>> 0, 1);
  packet.writeUInt32LE(Math.round(deviceTime) >>> 0, 5);
  return packet;
}

export function encodeTempo(revision: number, bpm: number, anchorDeviceMs: number, beatNumber: number): Buffer {
  const packet = Buffer.alloc(15);
  packet[0] = 40;
  packet.writeUInt32LE(revision >>> 0, 1);
  packet.writeUInt16LE(Math.round(bpm * 100), 5);
  packet.writeUInt32LE(Math.round(anchorDeviceMs) >>> 0, 7);
  packet.writeUInt32LE(beatNumber >>> 0, 11);
  return packet;
}
