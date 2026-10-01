const assert = require('node:assert/strict');
const { test } = require('node:test');
const { once } = require('node:events');
const { spawn } = require('node:child_process');
const { resolve } = require('node:path');
require('ts-node/register');
const { WebSocketServer } = require('ws');
const { Color, Clock, Ouput } = require('@lstudio/core');
const { getOutputAddresses } = require('../src/config');
const { createSyncedSocketOutput } = require('../src/ouputs/socket/createSyncSocketOutput');
const { OctaCoreOutput } = require('../src/ouputs/socket');
const { setLedColors } = require('../src/ouputs/socket/commands/setLedColors');
const { setColorPalette } = require('../src/ouputs/socket/commands/setColorPallete');

const waitFor = async predicate => {
  const deadline = Date.now() + 6000;
  while (!predicate()) {
    assert.ok(Date.now() < deadline, 'condition did not become true');
    await new Promise(resolve => setTimeout(resolve, 10));
  }
};

class TestClock extends Clock {
  starts = 0;
  start() { this.starts++; }
  stop() {}
  frame() { this.tick({ index: 1 }); }
}

function makeProject() {
  const palette = [new Color('#000000'), new Color('#ff0000')];
  return {
    ticks: 0,
    tick() { this.ticks++; },
    state: {
      palette,
      strips: Array.from({ length: 4 }, (_, i) => ({
        leds: Array(60).fill(palette[i % 2]), brightness: 80 + i, rotation: 30,
      })),
    },
  };
}

async function server(options = {}) {
  const wss = new WebSocketServer({ host: '127.0.0.1', port: 0, ...options });
  const connections = [];
  wss.on('connection', socket => {
    const packets = [];
    socket.on('message', data => packets.push(Buffer.from(data)));
    connections.push({ socket, packets });
  });
  await once(wss, 'listening');
  return {
    url: `ws://127.0.0.1:${wss.address().port}`,
    connections,
    async close() {
      wss.clients.forEach(socket => socket.terminate());
      await new Promise(resolve => wss.close(resolve));
    },
  };
}

test('left/right defaults, explicit IP fallback and invalid endpoints', () => {
  assert.deepEqual(getOutputAddresses({}), ['ws://octacore-left.local:81/', 'ws://octacore-right.local:81/']);
  assert.equal(getOutputAddresses({ OCTACORE_LEFT_URL: 'ws://192.0.2.10:81' })[0], 'ws://192.0.2.10:81/');
  for (const value of ['', 'http://example.test', 'ws://user:secret@example.test', 'ws://example.test/#fragment']) {
    assert.throws(() => getOutputAddresses({ OCTACORE_RIGHT_URL: value }), /OCTACORE_RIGHT_URL/);
  }
});

test('wire format preserves 16 RGB slots and low nibble first', () => {
  const palette = setColorPalette([new Color('#123456')]);
  assert.equal(palette.length, 49);
  assert.deepEqual([...palette.subarray(0, 4)], [2, 0x12, 0x34, 0x56]);
  assert.ok(palette.subarray(4).every(byte => byte === 0));
  const pixels = setLedColors(Array.from({ length: 60 }, (_, i) => i % 2 ? 2 : 1));
  assert.equal(pixels.length, 31);
  assert.equal(pixels[0], 3);
  assert.ok(pixels.subarray(1).every(byte => byte === 0x21));
  assert.throws(() => setLedColors([16]));
  assert.throws(() => setColorPalette(Array(17).fill(new Color('#000000'))));
});

test('two physical outputs share one animation tick and replay full state on reconnect', async t => {
  const left = await server();
  const right = await server();
  const project = makeProject();
  const clock = new TestClock();
  const stop = createSyncedSocketOutput(project, clock, [left.url, right.url]);
  t.after(async () => { stop(); await left.close(); await right.close(); });
  assert.equal(clock.starts, 1);
  await waitFor(() => left.connections[0]?.packets.length === 3 && right.connections[0]?.packets.length === 3);
  const leftPackets = left.connections[0].packets;
  const rightPackets = right.connections[0].packets;
  assert.deepEqual(leftPackets.map(packet => packet[0]), [2, 5, 3]);
  assert.equal(leftPackets[1][1], 80);
  assert.equal(rightPackets[1][1], 81);
  assert.equal(leftPackets[2][1], 0x00);
  assert.equal(rightPackets[2][1], 0x11);
  project.state.strips[0].rotation = 180;
  clock.frame();
  assert.equal(project.ticks, 1);
  await new Promise(resolve => setTimeout(resolve, 30));
  assert.equal(leftPackets.length, 3, 'unchanged LED state does not resend or emit servo');

  const blue = new Color('#0000ff');
  project.state.palette[1] = blue;
  project.state.strips[1].leds.fill(blue);
  clock.frame();
  await waitFor(() => rightPackets.length === 5);
  assert.deepEqual(rightPackets.slice(3).map(packet => packet[0]), [2, 3], 'palette edits redraw unchanged indices');
  right.connections[0].socket.terminate();
  await waitFor(() => right.connections[1]?.packets.length === 3);
  assert.deepEqual(right.connections[1].packets.map(packet => packet[0]), [2, 5, 3]);
  assert.deepEqual(right.connections[1].packets[0], rightPackets[3]);
  assert.equal(right.connections[1].packets[1][1], 81);
  for (const connection of [...left.connections, ...right.connections]) {
    assert.ok(connection.packets.every(packet => packet[0] !== 1));
  }
  stop();
  let otherFrames = 0;
  clock.subscribe(() => otherFrames++);
  stop();
  clock.frame();
  assert.equal(project.ticks, 2, 'group disposal removes the shared subscription');
  assert.equal(otherFrames, 1, 'repeated disposal preserves other subscribers');
});

test('missing peer does not prevent the available output from running', async t => {
  const left = await server();
  const project = makeProject();
  const clock = new TestClock();
  const stop = createSyncedSocketOutput(project, clock, [left.url, 'ws://127.0.0.1:1']);
  t.after(async () => { stop(); await left.close(); });
  assert.equal(clock.starts, 1);
  clock.frame();
  await waitFor(() => left.connections[0]?.packets.length === 3);
  assert.equal(project.ticks, 1);
});

test('generic Ouput still ticks and renders for existing consumers', () => {
  const project = makeProject();
  const clock = new TestClock();
  class GenericOutput extends Ouput { render(state) { this.latest = state; } }
  const output = new GenericOutput(project, clock);
  clock.frame();
  assert.equal(project.ticks, 1);
  assert.equal(output.latest, project.state);
});

test('a silent peer without pong is terminated and reconnected', async t => {
  const peer = await server({ autoPong: false });
  const output = new OctaCoreOutput({ project: makeProject(), clock: new TestClock(), url: peer.url, stripIndex: 0 });
  t.after(async () => { output.close(); await peer.close(); });
  await output.waitToGetReady;
  await waitFor(() => peer.connections[0]?.packets.length === 3);
  const ping = once(peer.connections[0].socket, 'ping');
  // Advance the heartbeat checks directly instead of waiting two 10-second periods.
  output.checkHeartbeat();
  await ping;
  output.checkHeartbeat();
  await waitFor(() => peer.connections[1]?.packets.length === 3);
  assert.deepEqual(peer.connections[1].packets.map(packet => packet[0]), [2, 5, 3]);
});

test('the real ts-node entry point starts the preset graph with no MIDI device', async t => {
  const left = await server();
  const right = await server();
  const child = spawn(process.execPath, [
    '-r', resolve(__dirname, 'fixtures/isolated-hardware.cjs'),
    require.resolve('ts-node/dist/bin.js'), 'src/index.ts',
  ], {
    cwd: resolve(__dirname, '..'),
    env: { ...process.env, OCTACORE_LEFT_URL: left.url, OCTACORE_RIGHT_URL: right.url },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let logs = '';
  child.stdout.on('data', data => logs += data);
  child.stderr.on('data', data => logs += data);
  t.after(async () => {
    if (child.exitCode === null && child.signalCode === null) {
      const exited = once(child, 'exit');
      child.kill('SIGTERM');
      await exited;
    }
    await left.close();
    await right.close();
  });
  await waitFor(() => {
    assert.equal(child.exitCode, null, logs);
    return left.connections[0]?.packets.length >= 3 && right.connections[0]?.packets.length >= 3;
  });
  await new Promise(resolve => setTimeout(resolve, 100));
  assert.equal(child.exitCode, null, logs);
  for (const peer of [left, right]) {
    assert.ok(peer.connections[0].packets.every(packet => packet[0] !== 1));
    assert.ok(peer.connections[0].packets.some(packet => packet[0] === 5 && packet[1] === 255), 'preset brightness is retained');
  }
});
