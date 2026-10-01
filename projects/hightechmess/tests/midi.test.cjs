const assert = require('node:assert/strict');
const { test } = require('node:test');
const { EventEmitter } = require('node:events');
const Module = require('node:module');
require('ts-node/register');

test('MIDI lifecycle uses one listener, independent ports and safe missing-device startup', async () => {
  const inputPorts = [];
  const outputPorts = [];
  const inputs = [];
  const outputs = [];
  const timers = new Set();
  class MockInput extends EventEmitter {
    opens = 0;
    closes = 0;
    constructor() { super(); inputs.push(this); }
    getPortCount() { return inputPorts.length; }
    getPortName(index) { return inputPorts[index]; }
    openPort() { this.opens++; }
    closePort() { this.closes++; }
  }
  class MockOutput {
    opens = 0;
    messages = [];
    constructor() { outputs.push(this); }
    getPortCount() { return outputPorts.length; }
    getPortName(index) { return outputPorts[index]; }
    openPort() { this.opens++; }
    closePort() {}
    sendMessage(message) { this.messages.push(message); }
  }
  const originalLoad = Module._load;
  const originalSetInterval = global.setInterval;
  const originalClearInterval = global.clearInterval;
  let midi;
  let instrument;
  try {
    Module._load = function(name, ...args) {
      if (name === 'midi') return { Input: MockInput, Output: MockOutput };
      return originalLoad.call(this, name, ...args);
    };
    global.setInterval = callback => { timers.add(callback); return callback; };
    global.clearInterval = callback => timers.delete(callback);
    midi = require('../src/common/midimix').default;
    // Avoid persistent control-cache writes: this test only exercises mocked hardware.
    midi.saveState = Object.assign(() => {}, { cancel() {} });
    const poll = () => [...timers].forEach(callback => callback());
    midi.turnOnColumnLights(0);
    assert.equal(outputs[0].messages.length, 0);
    poll(); poll();
    assert.equal(inputs[0].listenerCount('message'), 1);
    inputPorts.push('MIDI Mix');
    poll(); poll();
    assert.equal(inputs[0].opens, 1);
    assert.equal(outputs[0].opens, 0);
    outputPorts.push('MIDI Mix');
    poll(); poll();
    assert.equal(outputs[0].opens, 1);
    assert.ok(outputs[0].messages.some(message => message[1] === 2 && message[2] === 127));
    let releases = 0;
    midi.onComboButtonPressed((index, pressed) => { if (index === 0 && !pressed) releases++; });
    inputs[0].emit('message', 0, [144, 2, 0]);
    assert.equal(releases, 1, 'zero-velocity note-on is a release');
    inputs[0].emit('message', 0, [176, 19, 127]);
    assert.equal(midi.state.faders[0], 1, 'existing fader mapping is retained');
    let snapshots = 0;
    midi.onSendAll(() => {
      snapshots++;
      assert.equal(midi.state.masterFader, 64 / 127, 'last snapshot value is applied before notification');
    });
    const cc = [16,20,24,28,46,50,54,58,17,21,25,29,47,51,55,59,18,22,26,30,48,52,56,60,19,23,27,31,49,53,57,61,62];
    midi.snapshotSeen.clear();
    for (let i=0;i<40;i++) inputs[0].emit('message', 0, [176,19,i]);
    assert.equal(snapshots,0,'repeated ordinary fader movement never sends');
    midi.snapshotSeen.clear();
    for (const control of cc.slice(0,-1)) inputs[0].emit('message',0,[176,control,64]);
    assert.equal(snapshots,0,'incomplete snapshot never sends');
    inputs[0].emit('message',0,[176,62,64]);
    await new Promise(resolve=>setTimeout(resolve,12));
    assert.equal(snapshots,1,'complete snapshot sends exactly once');
    for (const control of cc) inputs[0].emit('message',0,[176,control,64]);
    await new Promise(resolve=>setTimeout(resolve,12));
    assert.equal(snapshots,2,'second SEND ALL has a new complete snapshot');
    for (const control of cc.slice(0,-1)) inputs[0].emit('message',0,[176,control,64]);
    for (const id of midi.snapshotSeen.keys()) midi.snapshotSeen.set(id, -1000);
    inputs[0].emit('message',0,[176,62,64]);
    await new Promise(resolve=>setTimeout(resolve,12));
    assert.equal(snapshots,2,'slow unrelated controls cannot form a snapshot');
    midi.snapshotSeen.clear();
    inputs[0].emit('message',0,[176,19,1]);
    midi.snapshotSeen.set(19, require('node:perf_hooks').performance.now()-240);
    for (const control of cc.filter(x=>x!==19)) inputs[0].emit('message',0,[176,control,64]);
    inputs[0].emit('message',0,[176,19,100]);
    await new Promise(resolve=>setTimeout(resolve,12));
    assert.equal(snapshots,3,'ordinary CC before SEND ALL does not consume its window');
    assert.equal(midi.state.faders[0],100/127,'snapshot settles before send');
    inputPorts.length = outputPorts.length = 0;
    poll();
    const sentBeforeDisconnect = outputs[0].messages.length;
    midi.setBankButton('right', true);
    assert.equal(outputs[0].messages.length, sentBeforeDisconnect);
    inputPorts.push('MIDI Mix');
    outputPorts.push('MIDI Mix');
    poll();
    assert.equal(inputs[0].opens, 2);
    assert.equal(outputs[0].opens, 2);
    assert.equal(inputs[0].listenerCount('message'), 1);
    assert.ok(outputs[0].messages.some(message => message[1] === 26 && message[2] === 127));
    midi.close();
    assert.equal(timers.size, 0);

    inputPorts.splice(0, inputPorts.length, 'Roland MC-707 MIDI 1');
    const { ExternalMidiInstrument } = require('../src/common/midi-instrument');
    instrument = new ExternalMidiInstrument(['MC-707']);
    poll(); poll();
    assert.equal(instrument.isConnected, true, 'monitor uses the same substring match as discovery');
    assert.equal(inputs[1].opens, 1);
    inputs[1].emit('message', 0, [144, 36, 127]);
    assert.equal(instrument.data.isKick, true);
    inputPorts.length = 0;
    poll();
    assert.equal(instrument.isConnected, false);
    assert.equal(instrument.data.isKick, false);
    inputPorts.push('Roland MC-707 MIDI 1');
    poll(); poll();
    assert.equal(inputs[1].opens, 2);
    assert.equal(inputs[1].listenerCount('message'), 1);
    inputs[1].emit('message', 0, [144, 36, 0]);
    assert.equal(instrument.data.isKick, false);
    instrument.close();
    assert.equal(timers.size, 0);
  } finally {
    midi?.close();
    instrument?.close();
    Module._load = originalLoad;
    global.setInterval = originalSetInterval;
    global.clearInterval = originalClearInterval;
  }
});
