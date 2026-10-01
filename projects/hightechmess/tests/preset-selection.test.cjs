const assert = require('node:assert/strict');
const { test } = require('node:test');
const { EventEmitter } = require('node:events');
const Module = require('node:module');
require('ts-node/register');

test('preset selection accepts both SOLO+MUTE release orders and legacy combo notes', () => {
  const inputs = [];
  class MockInput extends EventEmitter {
    constructor() { super(); inputs.push(this); }
    getPortCount() { return 0; }
    closePort() {}
  }
  class MockOutput {
    getPortCount() { return 0; }
    closePort() {}
    sendMessage() { throw new Error('Test must not send MIDI output'); }
  }
  const originalLoad = Module._load;
  const originalLog = console.log;
  const logs = [];
  let midi;
  try {
    Module._load = function(name, ...args) {
      if (name === 'midi') return { Input: MockInput, Output: MockOutput };
      return originalLoad.call(this, name, ...args);
    };
    console.log = message => logs.push(message);
    midi = require('../src/common/midimix').default;
    midi.saveState = Object.assign(() => {}, { cancel() {} });
    midi.state.soloButton = true; // Simulate a held SOLO restored from the old cache.
    const { project, OctaCoreProject } = require('../src/project');
    const { mods } = require('../src/mods');
    const send = (note, pressed) => inputs[0].emit('message', 0, [pressed ? 144 : 128, note, pressed ? 127 : 0]);
    const selected = name => assert.equal(project.getMod(), mods[name]);
    selected('weatherReactive');

    send(4, true);
    assert.equal(midi.state.buttons[0][1], true, 'plain MUTE retains its held effect state');
    send(4, false);
    assert.equal(midi.state.buttons[0][1], false);
    selected('weatherReactive');
    assert.equal(logs.length, 0, 'cached SOLO must not turn plain MUTE into selection');

    send(27, true);
    send(4, true);
    selected('weatherReactive');
    send(4, false);
    selected('simplePhotography');
    send(27, false);
    assert.deepEqual(logs, ['[Preset] Column 2: simplePhotography']);

    send(27, true);
    send(7, true);
    send(27, false);
    selected('simplePhotography');
    send(7, false);
    selected('daylight');
    assert.equal(logs.at(-1), '[Preset] Column 3: daylight');

    // A modifier pressed only after MUTE must not turn an ordinary hold into selection.
    send(10, true);
    send(27, true);
    send(10, false);
    send(27, false);
    selected('daylight');

    // REC stays an effect button, including while SOLO is held.
    send(27, true);
    send(12, true);
    assert.equal(midi.state.buttons[1][3], true);
    send(12, false);
    send(27, false);
    selected('daylight');

    send(11, true);
    selected('daylight');
    send(11, false);
    selected('liveCoding');
    const countAfterChange = logs.length;
    send(11, false);
    assert.equal(logs.length, countAfterChange, 'same preset does not log another change');

    send(20, true); // Legacy combo column 7 is outside the six-preset bank.
    send(20, false);
    send(27, true);
    send(19, true); // Ordinary MUTE column 7 is also outside the bank.
    send(27, false);
    send(19, false);
    selected('liveCoding');
    assert.equal(logs.length, countAfterChange);

    // Legacy zero-velocity note-on releases still select the same column.
    inputs[0].emit('message', 0, [144, 8, 0]);
    selected('daylight');

    // A second project must select its own mods, rather than redirecting to the singleton.
    const localMods = Object.fromEntries(Object.keys(mods).map(name => [name, {
      state: project.state,
      onSelected(state) { this.state = state; },
      init() {},
      update() {},
    }]));
    const localProject = new OctaCoreProject(project.state, localMods);
    send(5, true);
    send(5, false);
    assert.equal(localProject.getMod(), localMods.simplePhotography);
  } finally {
    midi?.close();
    Module._load = originalLoad;
    console.log = originalLog;
  }
});
