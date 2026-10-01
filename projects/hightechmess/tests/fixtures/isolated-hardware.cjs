// Loaded only by the startup test child process. Native MIDI is never required.
const Module = require('node:module');
const { EventEmitter } = require('node:events');
const WebSocket = require('ws');
class MissingMidi extends EventEmitter {
  getPortCount() { return 0; }
  closePort() {}
  openPort() { throw new Error('Startup test must not open a MIDI port'); }
  sendMessage() { throw new Error('Startup test must not write to MIDI'); }
}
class LoopbackOnlyWebSocket extends WebSocket {
  constructor(address, options) {
    if (new URL(address).hostname !== '127.0.0.1') {
      throw new Error('Startup test only permits loopback WebSockets');
    }
    super(address, options);
  }
}
const originalLoad = Module._load;
Module._load = function(name, ...args) {
  if (name === 'midi') return { Input: MissingMidi, Output: MissingMidi };
  if (name === 'ws') return LoopbackOnlyWebSocket;
  return originalLoad.call(this, name, ...args);
};
