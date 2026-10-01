const assert = require('node:assert/strict');
const { test } = require('node:test');
const { once } = require('node:events');
const { performance } = require('node:perf_hooks');
const http = require('node:http');
require('ts-node/register');
const { WebSocketServer } = require('ws');
const { defaultProgram, validateProgram, encodeStage, encodeCommit, encodeTempo } = require('../src/playground/program');
const { PlaygroundController } = require('../src/playground/controller');
const { BoardConnection, IPv4Resolver } = require('../src/playground/board');
const { createPlaygroundServer } = require('../src/playground/server');
const { attachMidi } = require('../src/playground/midi');
const { getTowerEndpoints, getOutputAddresses } = require('../src/config');

async function waitFor(condition, timeout = 1500) {
  const deadline = Date.now() + timeout;
  while (!condition()) {
    assert.ok(Date.now() < deadline, 'Timed out waiting for test condition');
    await new Promise(resolve => setTimeout(resolve, 5));
  }
}

async function fakeBoard(role, options = {}) {
  const wss = new WebSocketServer({ host: '127.0.0.1', port: 0 });
  const packets = [];
  const sockets = [];
  let revision = options.revision ?? 0;
  const offset = options.offset ?? role * 100000;
  wss.on('connection', socket => {
    sockets.push(socket);
    socket.on('message', bytes => {
      const p = Buffer.from(bytes);
      packets.push(p);
      const reply = data => { if (socket.readyState === 1) socket.send(data); };
      if (p[0] === 36 && !options.noHello) {
        const hello = Buffer.alloc(7);
        hello[0] = 37; hello[1] = options.version ?? 2; hello[2] = options.role ?? role;
        hello.writeUInt32LE(revision, 3);
        if (options.helloDelay) setTimeout(() => reply(hello), options.helloDelay);
        else reply(hello);
      }
      if (p[0] === 34 && !options.noClock) {
        const clock = Buffer.alloc(9);
        clock[0] = 35;
        p.copy(clock, 1, 1, 5);
        clock.writeUInt32LE(Math.floor(performance.now() + offset) >>> 0, 5);
        if (options.clockDelay) setTimeout(() => reply(clock), options.clockDelay);
        else reply(clock);
      }
      if (p[0] === 40 && !options.noTempoAck) {
        const ack = Buffer.alloc(5); ack[0] = 41;
        ack.writeUInt32LE(options.wrongTempoAck ? 0 : p.readUInt32LE(1), 1);
        if (options.tempoAckDelay) setTimeout(() => reply(ack), options.tempoAckDelay);
        else reply(ack);
      }
      if (p[0] === 44 && !options.noBlackoutAck) {
        const ack = Buffer.from(p); ack[0] = 45;
        if (p[5] && options.blackoutHoldAckDelay) setTimeout(() => reply(ack), options.blackoutHoldAckDelay);
        else reply(ack);
      }
      if ((p[0] === 32 && !options.noStageAck) || (p[0] === 33 && !options.noCommitAck)) {
        const ack = Buffer.alloc(6);
        ack[0] = 38;
        const r = p.readUInt32LE(p[0] === 32 ? 2 : 1);
        ack.writeUInt32LE(r, 1);
        ack[5] = p[0] === 32 ? 0 : 1;
        if (p[0] === 33) { revision = r; options.onCommit?.(); }
        if (p[0] === 32 && options.stageAckDelay) setTimeout(() => reply(ack), options.stageAckDelay);
        else if (p[0] === 33 && options.commitAckDelay) setTimeout(() => reply(ack), options.commitAckDelay);
        else reply(ack);
      }
      if (p[0] === 39) revision = 0;
    });
  });
  await once(wss, 'listening');
  return {
    url: `ws://127.0.0.1:${wss.address().port}`, packets, sockets, offset, options,
    setRevision(value) { revision = value; },
    async close() { sockets.forEach(socket => socket.terminate()); await new Promise(resolve => wss.close(resolve)); },
  };
}

async function pair(t, leftOptions, rightOptions, timeout = 100) {
  const left = await fakeBoard(0, leftOptions);
  const right = await fakeBoard(1, rightOptions);
  const controller = new PlaygroundController([left.url, right.url], timeout);
  t.after(async () => { controller.close(); await left.close(); await right.close(); });
  await waitFor(() => controller.getState().devices.every(device => device.connected));
  await waitFor(() => controller.getState().devices.every(device => device.compatible ? !device.stopPending : !!device.error));
  await waitFor(() => !controller.getState().tempo.syncing);
  await waitFor(() => controller.getState().blackout.synced || controller.getState().blackout.error);
  return { controller, left, right };
}

test('club program validation is strict and the stage wire layout is exactly 46 bytes', () => {
  const p = { ...defaultProgram, bpm: 127.35, seed: 0xfedcba98, effect: 5 };
  const stage = encodeStage(p, 0x12345678);
  assert.equal(stage.length, 46);
  assert.deepEqual([...stage.subarray(0, 8)], [32, 1, 0x78, 0x56, 0x34, 0x12, 0xbf, 0x31]);
  assert.deepEqual([...stage.subarray(8, 14)], [5, p.brightness, p.duty, p.division, p.dash, p.motion]);
  assert.equal(stage.readUInt32LE(14), p.seed);
  assert.equal(stage.subarray(18, 21).toString('hex'), p.colors[0].slice(1));
  assert.deepEqual([...stage.subarray(30)], p.steps);
  assert.equal(encodeCommit(1, 0x100000005).readUInt32LE(5), 5);
  const tempo = encodeTempo(17, 123.45, 0x100000025, 1234);
  assert.equal(tempo.length, 15);
  assert.equal(tempo[0], 40);
  assert.equal(tempo.readUInt32LE(1), 17);
  assert.equal(tempo.readUInt16LE(5), 12345);
  assert.equal(tempo.readUInt32LE(7), 37);
  assert.equal(tempo.readUInt32LE(11), 1234);
  for (const invalid of [null, [], {}, { ...p, x: 1 }, { ...p, bpm: 127.351 }, { ...p, bpm: NaN },
    { ...p, division: 3 }, { ...p, seed: -1 }, { ...p, effect: 6 }, { ...p, duty: 0 },
    { ...p, brightness: 256 }, { ...p, steps: [1] }, { ...p, colors: ['red', ...p.colors.slice(1)] }]) {
    assert.throws(() => validateProgram(invalid));
  }
});

test('club playback stages both boards, samples clocks, maps wrap and quantizes replacement', async t => {
  const { controller, left, right } = await pair(t, { offset: 0xffffff00 }, { offset: 100000 });
  await waitFor(() => controller.getState().devices.every(device => device.compatible));
  const result = await controller.play(defaultProgram);
  assert.equal(result.playing, true);
  assert.ok(result.originMs - result.nowMs >= 700);
  for (const board of [left, right]) {
    const commands = board.packets.map(p => p[0]);
    assert.ok(commands.filter(command => command === 34).length >= 3, 'three complete samples after membership settles');
    assert.ok(commands.indexOf(40) < commands.indexOf(32), 'tempo sync precedes effect stage');
    assert.deepEqual(commands.slice(-2), [32, 33]);
    const commit = board.packets.at(-1);
    const expected = Math.round(result.originMs + board.offset) >>> 0;
    const actual = commit.readUInt32LE(5);
    assert.ok(Math.abs((actual - expected) | 0) <= 3, 'device clock epoch matches shared host origin modulo uint32');
    assert.equal(commit.readUInt32LE(1), result.activeRevision);
  }
  const next = await controller.play({ ...defaultProgram, effect: 2 });
  const beats = (next.originMs - result.originMs) / (60000 / defaultProgram.bpm);
  assert.ok(Math.abs(beats - Math.round(beats)) < 1e-8);
  assert.notEqual(next.activeRevision, result.activeRevision);
});

test('partial commit acknowledgement failure blackouts both boards', async t => {
  const { controller, left, right } = await pair(t, {}, { noCommitAck: true });
  await waitFor(() => controller.getState().devices.every(device => device.compatible));
  await assert.rejects(controller.play(defaultProgram), /timed out/);
  await waitFor(() => controller.getState().devices.every(device => !device.stopPending));
  assert.ok([left, right].every(board => board.packets.filter(p => p[0] === 39).length === 2));
  assert.equal(controller.getState().playing, false);
  assert.equal(controller.getState().busy, false);
});

test('STOP wins while stage acknowledgement is pending and a second Play is rejected', async t => {
  const { controller, left, right } = await pair(t, {}, { noStageAck: true });
  await waitFor(() => controller.getState().devices.every(device => device.compatible));
  const play = controller.play(defaultProgram);
  const cancelled = assert.rejects(play, /cancelled/);
  await assert.rejects(controller.play(defaultProgram), error => error.status === 409);
  await waitFor(() => right.packets.some(p => p[0] === 32));
  controller.stop();
  await cancelled;
  await waitFor(() => controller.getState().devices.every(device => !device.stopPending));
  assert.ok([left, right].every(board => board.packets.filter(p => p[0] === 39).length === 2));
  const late = Buffer.alloc(6); late[0] = 38;
  late.writeUInt32LE(right.packets.find(p => p[0] === 32).readUInt32LE(2), 1);
  right.sockets[0].send(late);
  await new Promise(resolve => setTimeout(resolve, 30));
  assert.ok([left, right].every(board => !board.packets.some(p => p[0] === 33)));
  assert.equal(controller.getState().playing, false);
});

test('incompatible optional firmware receives no pattern and does not block an eligible tower', async t => {
  const { controller, left, right } = await pair(t, {}, { version: 1 });
  await waitFor(() => controller.getState().devices[1].error);
  const state = await controller.play(defaultProgram);
  assert.deepEqual(state.participantIds, [1]);
  assert.ok(left.packets.some(p => p[0] === 33));
  assert.ok(right.packets.every(p => p[0] !== 32 && p[0] !== 33));
});

test('clock timeout stops staged programs without committing either board', async t => {
  const { controller, left, right } = await pair(t, {}, { noClock: true });
  await assert.rejects(controller.play(defaultProgram), /timed out waiting for clock/);
  await waitFor(() => controller.getState().devices.every(device => !device.stopPending));
  assert.ok([left, right].every(board => !board.packets.some(p => p[0] === 33)));
});

test('STOP during partial commit cancels activation and cannot stop a later fresh Play', async t => {
  const { controller, left, right } = await pair(t, {}, { noCommitAck: true });
  const play = controller.play(defaultProgram);
  const cancelled = assert.rejects(play, /cancelled/);
  await waitFor(() => right.packets.some(p => p[0] === 33));
  controller.stop();
  await waitFor(() => controller.getState().devices.every(device => !device.stopPending));
  right.options.noCommitAck = false;
  const fresh = await controller.play({ ...defaultProgram, effect: 4 });
  await cancelled;
  assert.equal(fresh.playing, true);
  assert.equal(controller.getState().playing, true);
  assert.equal(left.packets.at(-1)[0], 33);
});

test('STOP while disconnected is confirmed after reconnect, with no automatic Play', async t => {
  const { controller, left, right } = await pair(t);
  await controller.play(defaultProgram);
  const stageCount = right.packets.filter(p => p[0] === 32).length;
  right.sockets[0].terminate();
  await waitFor(() => !controller.getState().devices[1].connected);
  const stopped = controller.stop();
  assert.equal(stopped.playing, false);
  assert.equal(stopped.devices[1].stopPending, true);
  assert.match(stopped.devices[1].error, /not yet confirmed/);
  await waitFor(() => right.sockets.length === 2 && !controller.getState().devices[1].stopPending, 4000);
  assert.equal(controller.getState().devices[1].activeRevision, 0);
  assert.equal(controller.getState().playing, false);
  assert.equal(right.packets.filter(p => p[0] === 32).length, stageCount);
  assert.equal(left.packets.filter(p => p[0] === 32).length, stageCount);
});

test('startup explicitly cancels inherited active and hidden pending programs', async t => {
  const { controller, left, right } = await pair(t, { revision: 77 }, { revision: 0 });
  assert.equal(controller.getState().playing, false);
  for (const board of [left, right]) {
    assert.deepEqual(board.packets.slice(0, 3).map(p => p[0]), [36, 39, 36]);
  }
  assert.ok(controller.getState().devices.every(device => device.activeRevision === 0 && !device.stopPending));
});

test('preview and MIDI edit drafts while four taps update only the independent clock', async t => {
  const { controller, left, right } = await pair(t);
  await waitFor(() => controller.getState().devices.every(device => device.compatible));
  const start = controller.getState();
  const packetCounts = [left.packets.length, right.packets.length];
  const preview = controller.updateDraft({ ...defaultProgram, duty: 80 });
  assert.equal(preview.draftVersion, start.draftVersion + 1);
  assert.equal(controller.updateDraft(preview.program).draftVersion, preview.draftVersion);
  const tapStart = performance.now() - 1500;
  controller.tap(tapStart); controller.tap(tapStart + 500); controller.tap(tapStart + 1000);
  assert.equal(controller.getState().tempo.bpm, defaultProgram.bpm);
  controller.tap(tapStart + 1500);
  assert.equal(controller.getState().program.bpm, 120);
  assert.equal(controller.getState().draftSource, 'tap');
  const handlers = {};
  const midi = {
    connected: true, state: { knobs: [[0], [0], [0]], faders: [0, 0] },
    onSoloButtonPressed(fn) { handlers.solo = fn; }, onComboButtonPressed(fn) { handlers.combo = fn; },
    onButtonPressed(fn) { handlers.button = fn; }, onBankRightButtonPressed(fn) { handlers.stop = fn; },
    onSendAll(fn) { handlers.sendAll = fn; },
  };
  const detach = attachMidi(controller, midi);
  t.after(detach);
  handlers.combo(5, false);
  assert.equal(controller.getState().program.effect, 5);
  handlers.solo(true); handlers.button(0, 2, true); handlers.solo(false); handlers.button(0, 2, false);
  assert.equal(controller.getState().program.effect, 2);
  midi.state.faders[0] = 1;
  midi.state.knobs[0][0] = 1;
  midi.state.knobs[1][0] = 1;
  midi.state.faders[1] = 1;
  await waitFor(() => controller.getState().program.brightness === 255);
  assert.equal(controller.getState().program.motion, 16);
  assert.equal(controller.getState().program.duty, 100);
  assert.equal(controller.getState().program.dash, 15);
  assert.equal(controller.getState().draftSource, 'midi');
  for (const [i, board] of [left, right].entries()) {
    assert.ok(board.packets.slice(packetCounts[i]).every(packet => packet[0] === 40), 'tap sync never stages or commits an effect');
  }
  assert.equal(controller.getState().midi.connected, true);
});

test('four latest captured taps anchor phase; BPM and offset changes preserve the independent clock', async t => {
  const { controller, left, right } = await pair(t);
  const initial = controller.getState();
  const lastTap = performance.now() - 500;
  controller.tap(lastTap - 1500);
  controller.tap(lastTap - 1000);
  controller.tap(lastTap - 500);
  assert.equal(controller.getState().tempo.revision, initial.tempo.revision);
  assert.equal(controller.getState().tempo.tapCount, 3);
  controller.tap(lastTap);
  let state = controller.getState();
  assert.equal(state.tempo.bpm, 120);
  assert.equal(state.tempo.anchorMs, lastTap);
  assert.equal(state.tempo.tapCount, 4);
  const fourthRevision = state.tempo.revision;
  controller.tap(lastTap + 500);
  assert.equal(controller.getState().tempo.anchorMs, lastTap + 500);
  assert.equal(controller.getState().tempo.revision, fourthRevision + 1);
  assert.equal(controller.getState().tempo.tapCount, 4, 'the fifth tap uses only the four latest taps');
  await waitFor(() => controller.getState().tempo.synced);
  const before = controller.getState();
  const changed = controller.updateTempo({ bpm: 150 });
  const oldBeat = (changed.nowMs - before.tempo.anchorMs) * before.tempo.bpm / 60000;
  const newBeat = (changed.nowMs - changed.tempo.anchorMs) * changed.tempo.bpm / 60000;
  assert.ok(Math.abs(oldBeat - newBeat) < 0.002);
  const aligned = controller.updateTempo({ offsetMs: 125 });
  assert.ok(Math.abs(aligned.tempo.anchorMs - changed.tempo.anchorMs - 125) < 1e-6);
  const tapBase = performance.now() - 1200;
  controller.tap(tapBase); controller.tap(tapBase + 400); controller.tap(tapBase + 800); controller.tap(tapBase + 1200);
  state = controller.getState();
  assert.equal(state.tempo.bpm, 150);
  assert.equal(state.tempo.anchorMs, tapBase + 1325);
  await waitFor(() => controller.getState().tempo.synced);
  for (const board of [left, right]) assert.ok(board.packets.every(packet => ![32, 33].includes(packet[0])));
  const heldAnchor = state.tempo.anchorMs;
  controller.stop();
  assert.equal(controller.getState().tempo.anchorMs, heldAnchor);
  assert.throws(() => controller.tap(performance.now() - 3001), /recent/);
  assert.throws(() => controller.tap(performance.now() + 101), /recent/);
  assert.throws(() => controller.updateTempo({ bpm: null }));
  assert.throws(() => controller.updateTempo({ offsetMs: 251 }));
});

test('tempo latest-wins sync never deploys unsent effect edits and scene BPM cannot alter the clock', async t => {
  const { controller, left, right } = await pair(t);
  await controller.play(defaultProgram);
  const active = controller.getState();
  const draft = controller.updateDraft({ ...defaultProgram, effect: 5, bpm: 200 });
  assert.equal(draft.program.bpm, active.tempo.bpm);
  assert.equal(draft.tempo.anchorMs, active.tempo.anchorMs);
  const stageCounts = [left, right].map(board => board.packets.filter(p => p[0] === 32).length);
  const clockCounts = [left, right].map(board => board.packets.filter(p => p[0] === 34).length);
  right.options.tempoAckDelay = 40;
  const first = controller.updateTempo({ bpm: 130 });
  await waitFor(() => right.packets.some(p => p[0] === 40 && p.readUInt32LE(1) === first.tempo.revision));
  controller.updateTempo({ bpm: 131 });
  const last = controller.updateTempo({ bpm: 132 });
  assert.equal(last.tempo.synced, false);
  await waitFor(() => controller.getState().tempo.synced);
  assert.equal(controller.getState().tempo.revision, last.tempo.revision);
  assert.equal(controller.getState().activeRevision, active.activeRevision);
  assert.equal(controller.getState().program.effect, 5);
  for (const [i, board] of [left, right].entries()) {
    assert.equal(board.packets.filter(p => p[0] === 32).length, stageCounts[i]);
    assert.equal(board.packets.filter(p => p[0] === 40).at(-1).readUInt16LE(5), 13200);
    assert.equal(board.packets.filter(p => p[0] === 34).length, clockCounts[i], 'fresh clock samples are reused');
  }
  const phase = controller.getState().tempo.anchorMs;
  await controller.play({ ...defaultProgram, bpm: 80 });
  assert.equal(controller.getState().tempo.anchorMs, phase);
  assert.equal(controller.getState().tempo.bpm, 132);
});

test('partial/wrong tempo ACK stays visibly unsynced and Play waits for latest confirmed tempo', async t => {
  const { controller, right } = await pair(t);
  right.options.wrongTempoAck = true;
  controller.updateTempo({ bpm: 145 });
  await waitFor(() => !controller.getState().tempo.syncing);
  assert.equal(controller.getState().tempo.synced, false);
  assert.match(controller.getState().tempo.error, /timed out/);
  right.options.wrongTempoAck = false;
  right.options.tempoAckDelay = 30;
  controller.updateTempo({ bpm: 146 });
  const sent = await controller.play(defaultProgram);
  assert.equal(sent.tempo.synced, true);
  assert.equal(sent.program.bpm, 146);
  const lastTempoIndex = right.packets.findLastIndex(p => p[0] === 40);
  const stageIndex = right.packets.findLastIndex(p => p[0] === 32);
  assert.ok(lastTempoIndex < stageIndex);
});

test('blackout release bypasses pending press and tempo ACK; sources aggregate and stale edges cannot re-hold', async t => {
  const { controller, left, right } = await pair(t);
  await controller.play(defaultProgram);
  const before = controller.getState();
  left.options.blackoutHoldAckDelay = right.options.blackoutHoldAckDelay = 70;
  right.options.tempoAckDelay = 70;
  controller.updateTempo({ bpm: 140 });
  const pressed = controller.updateBlackout({ held: true, clientId: 'tab', sequence: 1 });
  await waitFor(() => right.packets.some(p => p[0] === 44 && p[5] === 1 && p.readUInt32LE(1) === pressed.blackout.revision));
  const released = controller.updateBlackout({ held: false, clientId: 'tab', sequence: 2 });
  assert.equal(released.blackout.held, false);
  await waitFor(() => controller.getState().blackout.synced);
  assert.equal(controller.getState().activeRevision, before.activeRevision);
  assert.equal(controller.getState().playing, true);
  controller.updateBlackout({ held: true, clientId: 'tab', sequence: 1 });
  assert.equal(controller.getState().blackout.held, false);
  controller.setMidiBlackout(true);
  controller.updateBlackout({ held: true, clientId: 'tab', sequence: 3 });
  controller.setMidiBlackout(false);
  assert.equal(controller.getState().blackout.held, true);
  controller.updateBlackout({ held: false, clientId: 'tab', sequence: 4 });
  await waitFor(() => controller.getState().blackout.synced);
  await new Promise(resolve => setTimeout(resolve, 80));
  assert.equal(controller.getState().blackout.held, false);
  assert.equal(controller.getState().blackout.synced, true, 'late press ACK cannot override release');
  const phase = controller.getState().tempo.anchorMs;
  controller.stop();
  assert.equal(controller.getState().blackout.held, false);
  assert.equal(controller.getState().tempo.anchorMs, phase);
});

test('failed Play restores held blackout; stale released clients expire without evicting held sources', async t => {
  const { controller, right } = await pair(t);
  controller.updateBlackout({ held: true, clientId: 'held', sequence: 1 });
  await waitFor(() => controller.getState().blackout.synced);
  right.options.noCommitAck = true;
  await assert.rejects(controller.play(defaultProgram), /timed out/);
  await waitFor(() => controller.getState().blackout.synced && controller.getState().devices.every(device => !device.stopPending));
  const stopIndex = right.packets.findLastIndex(packet => packet[0] === 39);
  assert.ok(right.packets.slice(stopIndex + 1).some(packet => packet[0] === 44 && packet[5] === 1));
  assert.equal(controller.getState().blackout.held, true);
  right.options.noCommitAck = false;
  await controller.play(defaultProgram);
  assert.equal(controller.getState().blackout.held, true);
  for (let i = 0; i < 15; i++) controller.updateBlackout({ held: false, clientId: `old-${i}`, sequence: 2 });
  assert.throws(() => controller.updateBlackout({ held: false, clientId: 'new', sequence: 0 }), error => error.status === 429);
  for (const client of controller.browserHolds.values()) client.updatedAt -= 31000;
  controller.updateBlackout({ held: false, clientId: 'new', sequence: 0 });
  assert.equal(controller.getState().blackout.held, true, 'an old held source never expires');
  assert.equal(controller.browserHolds.size, 2);
});

test('an unconfirmed blackout release can be retried without another press', async t => {
  const { controller, right } = await pair(t);
  controller.updateBlackout({ held: true, clientId: 'retry', sequence: 1 });
  await waitFor(() => controller.getState().blackout.synced);
  right.options.noBlackoutAck = true;
  controller.updateBlackout({ held: false, clientId: 'retry', sequence: 2 });
  await waitFor(() => controller.getState().blackout.error);
  assert.equal(controller.getState().blackout.synced, false);
  right.options.noBlackoutAck = false;
  const previousRevision = controller.getState().blackout.revision;
  controller.updateBlackout({ held: false, clientId: 'retry', sequence: 2 });
  await waitFor(() => controller.getState().blackout.synced);
  assert.ok(controller.getState().blackout.revision > previousRevision);
  assert.equal(controller.getState().blackout.held, false);
});

test('MIDI SOLO timestamps exclude chords; SEND ALL flushes draft once and BANK RIGHT is momentary', async t => {
  const { controller, left } = await pair(t);
  const handlers = {};
  const midi = {
    connected: true, state: { knobs: [[0], [0], [0]], faders: [0, 0] },
    onSoloButtonPressed(fn) { handlers.solo = fn; }, onComboButtonPressed(fn) { handlers.combo = fn; },
    onButtonPressed(fn) { handlers.button = fn; }, onBankRightButtonPressed(fn) { handlers.bank = fn; },
    onSendAll(fn) { handlers.sendAll = fn; },
  };
  const detach = attachMidi(controller, midi); t.after(detach);
  const pressAt = performance.now();
  handlers.solo(true);
  await new Promise(resolve => setTimeout(resolve, 15));
  handlers.solo(false);
  assert.equal(controller.getState().tempo.tapCount, 1);
  assert.ok(Math.abs(controller.taps[0] - pressAt) < 2, 'SOLO uses press time, not delayed release');
  for (const soloFirst of [true, false]) {
    handlers.solo(true); handlers.button(0, 3, true);
    if (soloFirst) { handlers.solo(false); handlers.button(0, 3, false); }
    else { handlers.button(0, 3, false); handlers.solo(false); }
  }
  handlers.solo(true); handlers.combo(2, true); handlers.solo(false); handlers.combo(2, false);
  assert.equal(controller.getState().tempo.tapCount, 1);
  handlers.solo(true);
  controller.tap(performance.now());
  assert.doesNotThrow(() => handlers.solo(false), 'a newer browser tap makes a held MIDI press stale without crashing');
  assert.equal(controller.getState().tempo.tapCount, 2);
  midi.state.faders[0] = 0.5;
  midi.state.knobs[0][0] = 1;
  handlers.sendAll();
  await waitFor(() => controller.getState().playing);
  const stages = left.packets.filter(p => p[0] === 32);
  assert.equal(stages.length, 1);
  assert.equal(stages[0][9], 128);
  assert.equal(stages[0][13], 16);
  handlers.bank(true); assert.equal(controller.getState().blackout.held, true);
  handlers.bank(false); assert.equal(controller.getState().blackout.held, false);
  assert.equal(controller.getState().playing, true);
  handlers.bank(true);
  handlers.solo(true);
  midi.connected = false;
  await waitFor(() => !controller.getState().blackout.held);
  midi.connected = true;
  const taps = controller.getState().tempo.tapCount;
  handlers.solo(false);
  assert.equal(controller.getState().tempo.tapCount, taps, 'disconnect cancels a pending tap gesture');
});

function request(port, path, options = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request({ hostname: '127.0.0.1', port, path, method: options.method ?? 'GET',
      headers: options.headers ?? {} }, response => {
      let body = '';
      response.on('data', chunk => body += chunk);
      response.on('end', () => resolve({ status: response.statusCode, headers: response.headers, body }));
    });
    req.on('error', reject);
    req.end(options.body);
  });
}

test('HTTP restricts Host, Origin, content type, body size and fixed file paths', async t => {
  const { controller, right } = await pair(t);
  const server = createPlaygroundServer(controller);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise(resolve => server.close(resolve)));
  const port = server.address().port;
  const get = await request(port, '/api/state');
  assert.equal(get.status, 200);
  assert.equal(JSON.parse(get.body).program.effect, defaultProgram.effect);
  assert.match(JSON.parse(get.body).sessionId, /^[\da-f-]{36}$/);
  assert.ok(get.headers['content-security-policy'].includes("frame-ancestors 'none'"));
  assert.equal((await request(port, '/api/state', { headers: { Host: 'attacker.test' } })).status, 403);
  assert.equal((await request(port, '/api/state', { headers: { Origin: 'https://attacker.test' } })).status, 403);
  assert.equal((await request(port, '/api/state', { headers: { 'Sec-Fetch-Site': 'cross-site' } })).status, 403);
  assert.equal((await request(port, '/../server.ts')).status, 404);
  const post = (path, body, headers = { 'Content-Type': 'application/json' }) => request(port, path, { method: 'POST', body, headers });
  assert.equal((await post('/api/stop', '{}', { 'Content-Type': 'text/plain' })).status, 415);
  assert.equal((await post('/api/preview', 'x'.repeat(17000))).status, 413);
  assert.equal((await post('/api/preview', '{')).status, 400);
  assert.equal((await post('/api/preview', JSON.stringify({ ...defaultProgram, effect: 10 }))).status, 400);
  assert.equal((await post('/api/stop', '{"unexpected":1}')).status, 400);
  const good = await post('/api/preview', JSON.stringify({ ...defaultProgram, effect: 4 }));
  assert.equal(good.status, 200);
  assert.equal(JSON.parse(good.body).program.effect, 4);
  assert.equal((await post('/api/tempo', '{"offsetMs":-251}')).status, 400);
  assert.equal((await post('/api/tempo', '{"bpm":null}')).status, 400);
  assert.equal((await post('/api/tap', '{"atMs":"now"}')).status, 400);
  assert.equal((await post('/api/tap', JSON.stringify({ atMs: performance.now() - 4000 }))).status, 400);
  assert.equal((await post('/api/tap', JSON.stringify({ atMs: performance.now() }))).status, 200);
  assert.equal((await post('/api/tempo', '{"bpm":137,"offsetMs":20}')).status, 200);
  assert.equal((await post('/api/blackout', '{"held":true}')).status, 400);
  assert.equal((await post('/api/blackout', '{"held":true,"clientId":"http","sequence":1}')).status, 200);
  assert.equal((await post('/api/blackout', '{"held":false,"clientId":"http","sequence":2}')).status, 200);

  right.options.noStageAck = true;
  const pending = controller.play(defaultProgram);
  const cancelled = assert.rejects(pending, /cancelled/);
  assert.equal((await post('/api/play', '{')).status, 409, 'busy Play is rejected before reading its body');
  controller.stop();
  await cancelled;
  await waitFor(() => controller.getState().devices.every(device => !device.stopPending));
  right.options.noStageAck = false;

  // Stop must also cancel a Play whose request body had not finished arriving.
  let responsePromise;
  const slow = http.request({ hostname: '127.0.0.1', port, path: '/api/play', method: 'POST',
    headers: { 'Content-Type': 'application/json' } });
  responsePromise = new Promise((resolve, reject) => {
    slow.on('error', reject);
    slow.on('response', response => {
      response.resume();
      response.on('end', () => resolve(response.statusCode));
    });
  });
  slow.write('{');
  await new Promise(resolve => setTimeout(resolve, 20));
  assert.equal((await post('/api/stop', '{}')).status, 200);
  slow.end(JSON.stringify(defaultProgram).slice(1));
  assert.equal(await responsePromise, 409);
});


test('numbered endpoints preserve explicit legacy addresses and bound discovery fallback', () => {
  const defaults = getTowerEndpoints({});
  assert.deepEqual(defaults.map(endpoint => endpoint.id), [1, 2, 3, 4]);
  assert.deepEqual(defaults[0].urls, ['ws://octacore-1.local:81/', 'ws://octacore-left.local:81/']);
  assert.deepEqual(defaults[3].urls, ['ws://octacore-4.local:81/']);
  const custom = getTowerEndpoints({ OCTACORE_LEFT_URL: 'ws://127.0.0.1:8123', OCTACORE_2_URL: 'ws://127.0.0.1:8124' });
  assert.deepEqual(custom[0].urls, ['ws://127.0.0.1:8123/']);
  assert.deepEqual(custom[1].urls, ['ws://127.0.0.1:8124/']);
  assert.deepEqual(getOutputAddresses({}), ['ws://octacore-left.local:81/', 'ws://octacore-right.local:81/']);
  assert.throws(() => getTowerEndpoints({ OCTACORE_4_URL: 'ws://user:secret@localhost' }), /without credentials/);
  assert.throws(() => getTowerEndpoints({ OCTACORE_3_URL: 'https://localhost' }), /ws:/);
});

async function towers(t, entries, timeout = 100) {
  const controller = new PlaygroundController(entries.map(([id, board]) => ({ id, urls: [board.url] })), timeout);
  t.after(async () => { controller.close(); await Promise.all(entries.map(([, board]) => board.close())); });
  return controller;
}

test('sparse towers 1 and 3 play while absent 2 and 4 do not affect readiness or Stop', async t => {
  const first = await fakeBoard(0), third = await fakeBoard(2);
  const absent = await fakeBoard(1); const absentUrl = absent.url; await absent.close();
  const controller = new PlaygroundController([
    { id: 1, urls: [first.url] }, { id: 2, urls: [absentUrl] },
    { id: 3, urls: [third.url] }, { id: 4, urls: [absentUrl] },
  ], 100);
  t.after(async () => { controller.close(); await first.close(); await third.close(); });
  await waitFor(() => controller.getState().tempo.synced && controller.getState().blackout.synced && controller.getState().devices.filter(d => d.connected).every(d => !d.stopPending));
  const state = await controller.play(defaultProgram);
  assert.deepEqual(state.participantIds, [1, 3]);
  assert.deepEqual(state.devices.map(d => d.id), [1, 2, 3, 4]);
  assert.equal(first.packets.filter(p => p[0] === 32).length, 1);
  assert.equal(third.packets.filter(p => p[0] === 32).length, 1);
  const counts = [first, third].map(board => board.packets.filter(p => [34, 40, 44].includes(p[0])).length);
  await new Promise(resolve => setTimeout(resolve, 3100));
  assert.deepEqual([first, third].map(board => board.packets.filter(p => [34, 40, 44].includes(p[0])).length), counts,
    'failed optional discovery retries do not resend clock or blackout to active towers');
  controller.stop();
  await waitFor(() => controller.getState().devices.every(d => !d.stopPending));
  assert.ok(controller.getState().devices.filter(d => !d.connected).every(d => !d.stopPending));
});

test('a late optional tower is stopped and synchronized but cannot join an in-flight Send', async t => {
  const first = await fakeBoard(0, { stageAckDelay: 150 });
  const third = await fakeBoard(2, { helloDelay: 60, revision: 123 });
  const controller = await towers(t, [[1, first], [3, third]], 250);
  await waitFor(() => controller.getState().devices[0].compatible && !controller.getState().devices[0].stopPending);
  const playing = controller.play(defaultProgram);
  await waitFor(() => first.packets.some(p => p[0] === 32));
  await waitFor(() => controller.getState().devices[1].compatible && !controller.getState().devices[1].stopPending);
  const state = await playing;
  assert.deepEqual(state.participantIds, [1]);
  assert.equal(first.packets.filter(p => p[0] === 39).length, 1, 'arrival leaves existing tower running');
  assert.equal(third.packets.filter(p => p[0] === 39).length, 1);
  assert.ok(third.packets.some(p => p[0] === 40));
  assert.ok(third.packets.some(p => p[0] === 44));
  assert.ok(third.packets.every(p => p[0] !== 32 && p[0] !== 33));
  assert.equal(state.devices[1].needsSend, true);
  assert.deepEqual((await controller.play(defaultProgram)).participantIds, [1, 3]);
});

test('matching reconnect retains a participant; a rebooted participant is stopped without stopping its partner', async t => {
  const { controller, left, right } = await pair(t);
  await controller.play(defaultProgram);
  right.sockets[0].terminate();
  await waitFor(() => right.sockets.length === 2 && controller.getState().devices[1].compatible, 4000);
  assert.equal(right.packets.filter(p => p[0] === 39).length, 1, 'matching running revision survives reconnect');
  assert.deepEqual(controller.getState().participantIds, [1, 2]);
  right.setRevision(0);
  right.sockets[1].terminate();
  await waitFor(() => right.sockets.length === 3 && controller.getState().devices[1].compatible && !controller.getState().devices[1].stopPending, 4000);
  assert.equal(right.packets.filter(p => p[0] === 39).length, 2);
  assert.equal(left.packets.filter(p => p[0] === 39).length, 1);
  assert.deepEqual(controller.getState().participantIds, [1]);
  assert.equal(controller.getState().playing, true);
});

test('a later Send excludes an offline participant and retains its Stop intent on return', async t => {
  const { controller, left, right } = await pair(t);
  await controller.play(defaultProgram);
  right.sockets[0].terminate();
  await waitFor(() => !controller.getState().devices[1].connected);
  assert.deepEqual((await controller.play({ ...defaultProgram, effect: 3 })).participantIds, [1]);
  assert.equal(controller.getState().devices[1].stopPending, true);
  await waitFor(() => right.sockets.length === 2 && controller.getState().devices[1].compatible && !controller.getState().devices[1].stopPending, 4000);
  assert.equal(right.packets.filter(p => p[0] === 32).length, 1);
  assert.equal(left.packets.filter(p => p[0] === 32).length, 2);
  assert.deepEqual(controller.getState().participantIds, [1]);
});

test('discovery falls back to an explicitly listed legacy endpoint without altering tower identity', async t => {
  const missing = await fakeBoard(0); const missingUrl = missing.url; await missing.close();
  const legacy = await fakeBoard(0);
  const controller = new PlaygroundController([{ id: 1, urls: [missingUrl, legacy.url] }], 100);
  t.after(async () => { controller.close(); await legacy.close(); });
  await waitFor(() => controller.getState().devices[0].compatible && !controller.getState().devices[0].stopPending, 4000);
  assert.deepEqual((await controller.play(defaultProgram)).participantIds, [1]);
});

test('all four identities deploy together and retain independent clock samples', async t => {
  const boards = await Promise.all([0, 1, 2, 3].map(role => fakeBoard(role)));
  const controller = await towers(t, boards.map((board, i) => [i + 1, board]));
  await waitFor(() => controller.getState().devices.every(d => d.compatible && !d.stopPending) && controller.getState().tempo.synced && controller.getState().blackout.synced);
  const result = await controller.play(defaultProgram);
  assert.deepEqual(result.participantIds, [1, 2, 3, 4]);
  for (const board of boards) {
    const commit = board.packets.findLast(p => p[0] === 33);
    assert.equal(commit.readUInt32LE(1), result.activeRevision);
    const expected = Math.round(result.originMs + board.offset) >>> 0;
    assert.ok(Math.abs((commit.readUInt32LE(5) - expected) | 0) <= 3);
  }
});

test('no eligible tower keeps draft controls available but cannot claim synchronization or Play', async t => {
  const wrongIdentity = await fakeBoard(0);
  const controller = await towers(t, [[4, wrongIdentity]]);
  await waitFor(() => controller.getState().devices[0].connected && controller.getState().devices[0].error);
  assert.equal(controller.getState().devices[0].compatible, false);
  assert.match(controller.getState().devices[0].error, /identity mismatch/);
  controller.updateTempo({ bpm: 135 });
  controller.updateDraft({ ...defaultProgram, effect: 3 });
  controller.updateBlackout({ held: false, clientId: 'empty', sequence: 1 });
  await assert.rejects(controller.play(defaultProgram), error => error.status === 503);
  assert.equal(controller.getState().tempo.synced, false);
  assert.equal(controller.getState().blackout.synced, false);
  assert.ok(wrongIdentity.packets.every(p => ![32, 33, 40, 44].includes(p[0])));
});


test('slow optional clock calibration during commit cannot delay the captured tower past activation', async t => {
  const first = await fakeBoard(0, { commitAckDelay: 20 });
  const third = await fakeBoard(2, { noHello: true, clockDelay: 800 });
  const controller = await towers(t, [[1, first], [3, third]], 1000);
  await waitFor(() => controller.getState().devices[0].compatible && !controller.getState().devices[0].stopPending && controller.getState().tempo.synced);
  controller.updateTempo({ bpm: 240 });
  await waitFor(() => controller.getState().tempo.synced);
  first.options.onCommit = () => {
    // This makes the captured member unsynchronized when post-commit waiting
    // starts, while the newcomer needs three slow samples before it can ACK.
    first.options.tempoAckDelay = 80;
    controller.updateTempo({ bpm: 239 });
    third.options.noHello = false;
    third.sockets[0].send(Buffer.from([37, 2, 2, 0, 0, 0, 0]));
  };
  const sentAt = performance.now();
  const result = await controller.play(defaultProgram);
  assert.equal(result.playing, true);
  assert.deepEqual(result.participantIds, [1]);
  assert.equal(result.tempo.bpm, 239);
  assert.equal(result.tempo.synced, false, 'optional calibration remains in progress');
  assert.ok(performance.now() - sentAt < 1000, 'captured acknowledgement releases Send without waiting 2.4 seconds for the optional clock');
  assert.equal(first.packets.filter(p => p[0] === 39).length, 1);
  assert.ok(third.packets.every(p => p[0] !== 32 && p[0] !== 33));
});

test('each tower identity can be the sole participating device', async t => {
  for (const id of [1, 2, 3, 4]) {
    const board = await fakeBoard(id - 1);
    const controller = await towers(t, [[id, board]]);
    await waitFor(() => controller.getState().devices[0].compatible && !controller.getState().devices[0].stopPending && controller.getState().tempo.synced && controller.getState().blackout.synced);
    assert.deepEqual((await controller.play(defaultProgram)).participantIds, [id]);
    controller.stop();
    await waitFor(() => !controller.getState().devices[0].stopPending);
    controller.close();
  }
});

test('captured blackout ACK releases Send while an optional arrival withholds its ACK', async t => {
  const first = await fakeBoard(0, { blackoutHoldAckDelay: 80 });
  const third = await fakeBoard(2, { noHello: true, noBlackoutAck: true });
  const controller = await towers(t, [[1, first], [3, third]], 1000);
  await waitFor(() => controller.getState().devices[0].compatible && !controller.getState().devices[0].stopPending && controller.getState().tempo.synced && controller.getState().blackout.synced);
  controller.setMidiBlackout(true);
  const sentAt = performance.now();
  const playing = controller.play(defaultProgram);
  third.options.noHello = false;
  third.sockets[0].send(Buffer.from([37, 2, 2, 0, 0, 0, 0]));
  const result = await playing;
  assert.deepEqual(result.participantIds, [1]);
  assert.equal(result.blackout.held, true);
  assert.equal(result.blackout.synced, false);
  assert.ok(performance.now() - sentAt < 500, 'optional blackout timeout cannot hold up a captured ACK');
  assert.ok(third.packets.every(p => p[0] !== 32 && p[0] !== 33));
});


test('pending DNS is coalesced without retry backlog while other towers connect independently', async t => {
  const first = await fakeBoard(0), second = await fakeBoard(1), fourth = await fakeBoard(3);
  const calls = [];
  let completeMissing;
  const resolver = new IPv4Resolver(hostname => {
    calls.push(hostname);
    if (hostname === 'absent.local') return new Promise(resolve => { completeMissing = resolve; });
    return Promise.resolve('127.0.0.1');
  });
  const address = (board, host) => board.url.replace('127.0.0.1', host);
  const boards = [
    new BoardConnection(1, [address(first, 'absent.local'), address(first, 'legacy.local')], 100, undefined, undefined, resolver),
    new BoardConnection(2, [address(second, 'known-two.local')], 100, undefined, undefined, resolver),
    new BoardConnection(3, [address(first, 'absent.local')], 100, undefined, undefined, resolver),
    new BoardConnection(4, [address(fourth, 'known-four.local')], 100, undefined, undefined, resolver),
  ];
  t.after(async () => {
    boards.forEach(board => board.close());
    completeMissing?.('127.0.0.1');
    await Promise.all([first, second, fourth].map(board => board.close()));
  });
  await waitFor(() => boards[1].state.compatible && boards[3].state.compatible);
  assert.equal(first.sockets.length, 0);
  await new Promise(resolve => setTimeout(resolve, 6100));
  assert.deepEqual(calls.sort(), ['absent.local', 'known-four.local', 'known-two.local']);
  assert.equal(first.sockets.length, 0, 'pending resolution never starts a handshake or parallel alias lookup');
  boards.forEach(board => board.close());
  completeMissing('127.0.0.1');
  await new Promise(resolve => setTimeout(resolve, 30));
  assert.equal(first.sockets.length, 0, 'late DNS completion cannot open a socket after disposal');
});

test('IPv4 resolution caches positives briefly, invalidates failures and bypasses numeric addresses', async () => {
  let now = 0, calls = 0, rejectLookup = false;
  const resolver = new IPv4Resolver(async () => {
    calls++;
    if (rejectLookup) throw new Error('DNS failed');
    return '127.0.0.1';
  }, () => now);
  assert.equal(await resolver.resolve('127.0.0.2'), '127.0.0.2');
  assert.equal(calls, 0);
  const a = resolver.resolve('tower.local'), b = resolver.resolve('tower.local');
  assert.equal(a, b, 'same pending native lookup is shared');
  await a;
  await resolver.resolve('tower.local');
  assert.equal(calls, 1);
  now = 30001;
  await resolver.resolve('tower.local');
  assert.equal(calls, 2);
  resolver.invalidate('tower.local');
  rejectLookup = true;
  await assert.rejects(resolver.resolve('tower.local'), /DNS failed/);
  rejectLookup = false;
  await resolver.resolve('tower.local');
  assert.equal(calls, 4, 'rejected lookup does not poison subsequent discovery');
});

test('a completed DNS failure advances to the legacy alias without emitting a roster disconnect', async t => {
  const board = await fakeBoard(0);
  const calls = [];
  const resolver = new IPv4Resolver(async hostname => {
    calls.push(hostname);
    if (hostname === 'canonical.local') throw new Error('Not found');
    return '127.0.0.1';
  });
  let disconnects = 0;
  const connection = new BoardConnection(1, [board.url.replace('127.0.0.1', 'canonical.local'), board.url.replace('127.0.0.1', 'legacy.local')],
    100, undefined, () => { disconnects++; }, resolver);
  t.after(async () => { connection.close(); await board.close(); });
  await waitFor(() => connection.state.compatible, 4000);
  assert.deepEqual(calls, ['canonical.local', 'legacy.local']);
  assert.equal(disconnects, 0);
});
