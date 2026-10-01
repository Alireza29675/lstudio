/* LStudio After Hours — scene authoring with an independent, automatically synchronized beat clock. */
'use strict';
const $ = (id) => document.getElementById(id);
const palettes = {
  acid: ['#cbfa72', '#80dbf4', '#f26aaf', '#ffffff'],
  velvet: ['#bd85ff', '#ff4593', '#506bff', '#ffe0fa'],
  heat: ['#ff6038', '#ffbe55', '#e62657', '#fff0c2'],
  ice: ['#73efff', '#5975ff', '#c4fff0', '#ffffff'],
};
const defaultLayouts = [
  { x: 440, y: 210, rotation: 24 },
  { x: 760, y: 210, rotation: -52 },
  { x: 230, y: 210, rotation: 24 },
  { x: 970, y: 210, rotation: -52 },
];
const layoutKey = 'lstudio-strip-layout-v2';
let stripLayouts = loadStripLayouts(),
  selectedTower = null,
  drag = null;
const base = {
  bpm: 128,
  effect: 1,
  brightness: 64,
  duty: 70,
  division: 2,
  dash: 4,
  motion: 4,
  seed: 12345,
  colors: palettes.acid.slice(),
  steps: [1, 0, 1, 4, 0, 2, 0, 1, 1, 0, 4, 0, 3, 0, 1, 4],
};
const scenes = [
  {
    name: 'Velvet Strobe',
    effect: 0,
    palette: 'velvet',
    duty: 20,
    motion: 4,
    dash: 4,
    steps: [1, 0, 1, 0, 1, 0, 4, 0, 2, 0, 1, 0, 3, 0, 4, 0],
  },
  {
    name: 'Acid Steps',
    effect: 1,
    palette: 'acid',
    duty: 70,
    motion: 4,
    dash: 4,
    steps: base.steps,
  },
  {
    name: 'Ricochet',
    effect: 2,
    palette: 'ice',
    duty: 95,
    motion: 5,
    dash: 7,
    steps: [1, 1, 1, 2, 1, 1, 4, 1, 2, 2, 2, 3, 1, 1, 4, 0],
  },
  {
    name: 'Afterimage',
    effect: 3,
    palette: 'velvet',
    duty: 100,
    motion: 3,
    dash: 8,
    steps: [1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4],
  },
  {
    name: 'Scatterbrain',
    effect: 4,
    palette: 'heat',
    duty: 38,
    motion: 4,
    dash: 4,
    steps: [1, 0, 4, 0, 2, 4, 0, 1, 4, 0, 3, 0, 1, 4, 4, 0],
  },
  {
    name: 'Low Tide',
    effect: 5,
    palette: 'ice',
    duty: 100,
    motion: 4,
    dash: 4,
    division: 1,
    steps: [1, 1, 2, 1, 1, 1, 4, 0, 2, 2, 3, 2, 1, 1, 4, 0],
  },
];
let program = structuredClone(base),
  paint = 1,
  previewRunning = !matchMedia('(prefers-reduced-motion: reduce)').matches,
  previewOrigin = performance.now(),
  pausedElapsed = 0;
let serverState = null,
  draftVersion = -1,
  dirty = false,
  editSerial = 0,
  syncTimer = null,
  previewPosting = false,
  activeFingerprint = '',
  sending = false,
  initialized = false,
  localTitle = 'Acid Steps';
let lastStep = -1,
  lastNotice = '',
  polling = false,
  draftRequest = null,
  transportGeneration = 0;
const fingerprint = (p) =>
  JSON.stringify(
    Object.keys(base)
      .filter((key) => key !== 'bpm')
      .sort()
      .map((key) => (key === 'colors' ? p.colors.map((c) => c.toLowerCase()) : p[key]))
  );
let tempo = null,
  tempoStateAt = -Infinity,
  statusStateAt = -Infinity,
  clockSamples = [],
  hostOffset = null,
  lastHostTime = -Infinity,
  serverSessionId = null,
  tempoRequests = Promise.resolve();
const retiredSessions = new Set();
const colorFor = (n) => (n === 0 ? '#69716c' : n === 4 ? '#c6cbd0' : program.colors[n - 1]);
const paintName = (n) => ['Rest', '1', '2', '3', 'Random'][n];
function notice(message, error = false) {
  if (message !== lastNotice) {
    $('notice').textContent = message;
    lastNotice = message;
  }
  $('notice').classList.toggle('error', error);
  $('notice').hidden = !error;
}
function validate(p) {
  if (!p || typeof p !== 'object' || Array.isArray(p)) throw Error('Choose a valid scene JSON file.');
  const keys = Object.keys(base);
  if (Object.keys(p).length !== keys.length || !keys.every((k) => Object.hasOwn(p, k)))
    throw Error('Scene fields do not match this playground.');
  const ranges = {
    bpm: [40, 240],
    effect: [0, 5],
    brightness: [0, 255],
    duty: [1, 100],
    dash: [1, 15],
    motion: [1, 16],
    seed: [0, 4294967295],
  };
  for (const [k, [min, max]] of Object.entries(ranges)) {
    if (!Number.isFinite(p[k]) || p[k] < min || p[k] > max || (k !== 'bpm' && !Number.isInteger(p[k])))
      throw Error(`Invalid ${k}.`);
  }
  if (Math.abs(p.bpm * 100 - Math.round(p.bpm * 100)) > 1e-6) throw Error('BPM supports at most two decimal places.');
  if (
    ![1, 2, 4].includes(p.division) ||
    !Array.isArray(p.colors) ||
    p.colors.length !== 4 ||
    !p.colors.every((c) => typeof c === 'string' && /^#[\da-f]{6}$/i.test(c)) ||
    !Array.isArray(p.steps) ||
    p.steps.length !== 16 ||
    !p.steps.every((n) => Number.isInteger(n) && n >= 0 && n <= 4)
  )
    throw Error('Invalid palette or beat grid.');
  return structuredClone(p);
}
async function api(path, body) {
  const sentAt = performance.now();
  const r = await fetch(
    `/api/${path}`,
    body === undefined
      ? {}
      : {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          keepalive: path === 'blackout' && body.held === false,
        }
  );
  let data;
  try {
    data = await r.json();
  } catch {
    throw Error('The playground server returned an invalid response.');
  }
  const receivedAt = performance.now();
  if (data.sessionId && retiredSessions.has(data.sessionId)) return data;
  if (data.sessionId && data.sessionId !== serverSessionId) {
    if (serverSessionId) retiredSessions.add(serverSessionId);
    serverSessionId = data.sessionId;
    statusStateAt = -Infinity;
    clockSamples = [];
    tempoStateAt = -Infinity;
    blackoutStateAt = -Infinity;
    lastHostTime = -Infinity;
  }
  if (Number.isFinite(data.nowMs)) {
    // Capture click time locally; HTTP latency must never become the beat offset.
    const rtt = receivedAt - sentAt;
    if (data.nowMs < lastHostTime - 10000) {
      clockSamples = [];
      lastHostTime = data.nowMs;
      tempoStateAt = -Infinity;
    }
    lastHostTime = Math.max(lastHostTime, data.nowMs);
    clockSamples.push({ rtt, offset: data.nowMs - (sentAt + receivedAt) / 2 });
    clockSamples = clockSamples.slice(-20);
    hostOffset = clockSamples.reduce((a, b) => (a.rtt < b.rtt ? a : b)).offset;
  }
  if (!r.ok) {
    if (data.devices) applyStatus(data);
    throw Error(data.error || `Request failed (${r.status})`);
  }
  return data;
}
function edit() {
  dirty = true;
  editSerial++;
  $('draft-label').textContent = 'Edited';
  renderControls();
  clearTimeout(syncTimer);
  syncTimer = setTimeout(syncDraft, 180);
}
function syncDraft() {
  if (draftRequest) return draftRequest;
  previewPosting = true;
  const serial = editSerial;
  draftRequest = (async () => {
    try {
      const state = await api('preview', program);
      if (applyStatus(state)) draftVersion = state.draftVersion;
      if (serial === editSerial) dirty = false;
    } catch (e) {
      notice(e.message, true);
    } finally {
      previewPosting = false;
      draftRequest = null;
      if (dirty && serial !== editSerial) syncTimer = setTimeout(syncDraft, 100);
    }
  })();
  return draftRequest;
}
function renderControls() {
  for (const key of ['bpm', 'division', 'brightness', 'duty', 'motion', 'dash'])
    if (document.activeElement !== $(key)) $(key).value = program[key];
  $('brightness-out').value = `${Math.round((program.brightness / 255) * 100)}%`;
  $('duty-out').value = `${program.duty}%`;
  $('motion-out').value = `${program.motion}×`;
  $('dash-out').value = `${program.dash}px`;
  document.querySelectorAll('.preset').forEach((b, i) => {
    b.classList.toggle('selected', i === program.effect);
    b.setAttribute('aria-pressed', String(i === program.effect));
  });
  document.querySelectorAll('.color input').forEach((input, i) => {
    input.value = program.colors[i];
    input.nextElementSibling.textContent = program.colors[i].toUpperCase();
  });
  document.querySelectorAll('.paint-tools button').forEach((b, i) => {
    b.style.setProperty('--color', colorFor(i));
    b.classList.toggle('active', i === paint);
    b.setAttribute('aria-pressed', String(i === paint));
  });
  document.querySelectorAll('.step').forEach((b, i) => {
    const n = program.steps[i];
    b.style.setProperty('--color', colorFor(n));
    b.classList.toggle('lit', n !== 0);
    b.querySelector('.step-mark').textContent = n === 4 ? 'R' : '';
    b.setAttribute('aria-label', `Step ${i + 1}: ${paintName(n)}. Paint ${paintName(paint).toLowerCase()}.`);
  });
}
scenes.forEach((scene) => {
  const b = document.createElement('button');
  b.className = 'preset';
  b.textContent = scene.name;
  b.onclick = () => {
    program = {
      ...program,
      effect: scene.effect,
      duty: scene.duty,
      motion: scene.motion,
      dash: scene.dash,
      division: scene.division || 2,
      colors: palettes[scene.palette].slice(),
      steps: scene.steps.slice(),
    };
    localTitle = scene.name;
    edit();
  };
  $('presets').append(b);
});
for (let i = 0; i < 5; i++) {
  const b = document.createElement('button');
  const dot = document.createElement('span');
  dot.className = 'swatch';
  b.append(dot, paintName(i));
  b.onclick = () => {
    paint = i;
    renderControls();
  };
  $('paint-tools').append(b);
}
for (let i = 0; i < 16; i++) {
  const b = document.createElement('button');
  b.className = 'step';
  const n = document.createElement('span');
  n.className = 'step-num';
  n.textContent = String(i + 1).padStart(2, '0');
  const mark = document.createElement('span');
  mark.className = 'step-mark';
  b.append(n, mark);
  b.onclick = () => {
    program.steps[i] = program.steps[i] === paint ? 0 : paint;
    edit();
  };
  $('steps').append(b);
}
for (let i = 0; i < 4; i++) {
  const label = document.createElement('label');
  label.className = 'color';
  const input = document.createElement('input');
  input.type = 'color';
  input.setAttribute('aria-label', `Palette color ${i + 1}${i === 3 ? ' (random hits)' : ''}`);
  input.oninput = () => {
    program.colors[i] = input.value;
    edit();
  };
  const hex = document.createElement('span');
  label.append(input, hex);
  $('colors').append(label);
}
for (const key of ['division', 'brightness', 'duty', 'motion', 'dash'])
  $(key).addEventListener('input', () => {
    const n = Number($(key).value);
    try {
      const next = { ...program, [key]: n };
      validate(next);
      program = next;
      edit();
    } catch (e) {
      if (key === 'bpm') return;
      $(key).value = program[key];
      notice(e.message, true);
    }
  });
$('bpm').addEventListener('change', () => {
  const bpm = Number($('bpm').value);
  try {
    validate({ ...program, bpm });
    setTempo({ bpm });
  } catch (e) {
    $('bpm').value = tempo?.bpm ?? program.bpm;
    notice(e.message, true);
  }
});
$('offset').addEventListener('input', () => {
  $('offset-out').value = offsetLabel(Number($('offset').value));
});
$('offset').addEventListener('change', () => setTempo({ offsetMs: Number($('offset').value) }));
$('offset-reset').onclick = () => setTempo({ offsetMs: 0 });
function offsetLabel(value) {
  return `${value > 0 ? '+' : ''}${value} ms`;
}
function queueTempo(request) {
  tempoRequests = tempoRequests.then(request).catch((e) => notice(e.message, true));
  return tempoRequests;
}
function setTempo(change) {
  return queueTempo(async () => {
    const state = await api('tempo', change);
    applyState(state);
  });
}
document.querySelectorAll('[data-palette]').forEach(
  (b) =>
    (b.onclick = () => {
      program.colors = palettes[b.dataset.palette].slice();
      edit();
    })
);
$('clear').onclick = () => {
  program.steps.fill(0);
  edit();
};
$('shuffle').onclick = () => {
  program.seed = crypto.getRandomValues(new Uint32Array(1))[0];
  edit();
  notice('New random seed. Hits stay on the same beats; their colors and positions change.');
};
$('preview-toggle').onclick = () => {
  if (previewRunning) pausedElapsed = performance.now() - previewOrigin;
  previewRunning = !previewRunning;
  updatePreviewToggle();
};
function updatePreviewToggle() {
  document.body.classList.toggle('preview-paused', !previewRunning);
  $('preview-toggle').textContent = previewRunning ? 'Pause preview' : 'Start preview';
  $('preview-toggle').setAttribute('aria-pressed', String(previewRunning));
}
function tapTempo() {
  if (serverState && !serverState.tempo) {
    notice('The new beat clock is prepared. Update both boards and restart the server to use it.');
    return Promise.resolve();
  }
  const clickedAt = performance.now();
  const clickHostOffset = hostOffset;
  $('tap').classList.add('tapped');
  setTimeout(() => $('tap').classList.remove('tapped'), 100);
  return queueTempo(async () => {
    if (hostOffset === null) applyState(await api('state'));
    if (hostOffset === null) throw Error('Waiting for the server clock. Tap again when connected.');
    const state = await api('tap', { atMs: clickedAt + (clickHostOffset ?? hostOffset) });
    applyState(state);
  });
}
$('tap').onclick = tapTempo;
document.addEventListener('keydown', (e) => {
  if (e.target.closest('input,select,textarea,dialog') || e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.key.toLowerCase() === 't' && !e.repeat) {
    e.preventDefault();
    tapTempo();
  }
});
$('send').onclick = async () => {
  if (sending) return;
  const generation = ++transportGeneration;
  sending = true;
  $('send').disabled = true;
  clearTimeout(syncTimer);
  const sent = structuredClone(program);
  if (draftRequest) await draftRequest;
  await tempoRequests;
  if (generation !== transportGeneration) {
    sending = false;
    updateSend();
    return;
  }
  notice('Sending…');
  try {
    const state = await api('play', sent);
    if (generation !== transportGeneration) return;
    activeFingerprint = fingerprint(sent);
    applyState(state);
    previewRunning = true;
    updatePreviewToggle();
    notice('Playing');
  } catch (e) {
    if (generation === transportGeneration) notice(e.message, true);
  } finally {
    sending = false;
    updateSend();
  }
};
$('stop-persistent').onclick = async () => {
  transportGeneration++;
  notice('Stopping…');
  try {
    const state = await api('stop', {});
    applyState(state);
    activeFingerprint = '';
    notice(state.error || 'Stopped', Boolean(state.error));
  } catch (e) {
    notice(`Blackout could not be confirmed: ${e.message}`, true);
  }
};
const blackoutClientId = crypto.randomUUID();
let blackoutSequence = 0,
  blackoutHeld = false,
  blackoutPending = null,
  blackoutStateAt = -Infinity;
const blackoutRequests = new Set();
function sendBlackoutEdge(edge) {
  if (!edge || blackoutRequests.has(edge.sequence)) return Promise.resolve();
  blackoutRequests.add(edge.sequence);
  return api('blackout', edge)
    .then((state) => {
      if (blackoutPending === edge) blackoutPending = null;
      applyStatus(state);
    })
    .catch((e) => {
      notice(`Blackout ${edge.held ? 'hold' : 'release'} not confirmed: ${e.message}`, true);
    })
    .finally(() => blackoutRequests.delete(edge.sequence));
}
function holdBlackout(held) {
  if (blackoutHeld === held) return sendBlackoutEdge(blackoutPending);
  blackoutHeld = held;
  $('stop').classList.toggle('held', held);
  $('stop').setAttribute('aria-pressed', String(held));
  blackoutPending = { held, clientId: blackoutClientId, sequence: ++blackoutSequence };
  // Release goes straight out, even while press/tempo/program ACKs are pending.
  return sendBlackoutEdge(blackoutPending);
}
$('stop').addEventListener('pointerdown', (event) => {
  if (event.button !== 0) return;
  event.preventDefault();
  $('stop').setPointerCapture(event.pointerId);
  holdBlackout(true);
});
for (const name of ['pointerup', 'pointercancel', 'lostpointercapture'])
  $('stop').addEventListener(name, () => holdBlackout(false));
$('stop').addEventListener('keydown', (event) => {
  if (![' ', 'Enter'].includes(event.key)) return;
  event.preventDefault();
  if (!event.repeat) holdBlackout(true);
});
$('stop').addEventListener('keyup', (event) => {
  if (![' ', 'Enter'].includes(event.key)) return;
  event.preventDefault();
  holdBlackout(false);
});
$('stop').addEventListener('blur', () => holdBlackout(false));
window.addEventListener('blur', () => holdBlackout(false));
window.addEventListener('pagehide', () => holdBlackout(false));
document.addEventListener('visibilitychange', () => {
  if (document.hidden) holdBlackout(false);
});
function towerId(device) {
  return device.id ?? (device.role === 'left' ? 1 : device.role === 'right' ? 2 : null);
}
function connectedTowers() {
  return (serverState?.devices ?? [])
    .filter((d) => d.connected && [1, 2, 3, 4].includes(towerId(d)))
    .map(towerId)
    .sort((a, b) => a - b);
}
function readyTowers() {
  return (serverState?.devices ?? []).filter((d) => d.connected && d.compatible && !d.stopPending);
}
function updateSend() {
  const ready = readyTowers().length > 0;
  $('send').disabled = sending || Boolean(serverState?.busy) || !ready;
  $('send').title = ready ? 'Load this draft on ready towers' : 'No towers ready';
}
function applyTempo(state) {
  if (!state.tempo || !Number.isFinite(state.nowMs) || state.nowMs < tempoStateAt) return;
  tempoStateAt = state.nowMs;
  tempo = state.tempo;
  program.bpm = tempo.bpm;
  if (hostOffset !== null) previewOrigin = tempo.anchorMs - hostOffset;
  if (document.activeElement !== $('bpm')) $('bpm').value = tempo.bpm;
  if (document.activeElement !== $('offset')) {
    $('offset').value = tempo.offsetMs;
    $('offset-out').value = offsetLabel(tempo.offsetMs);
  }
  $('tap-count').textContent = tempo.tapCount > 0 && tempo.tapCount < 4 ? `${tempo.tapCount}/4` : '';
  $('clock-status').textContent = tempo.syncing
    ? 'Syncing…'
    : tempo.error
    ? 'Not synced'
    : tempo.synced
    ? 'Synced'
    : 'Offline';
  $('clock-status').classList.toggle('error', Boolean(tempo.error));
  $('clock-status').title = tempo.error || 'Tempo and alignment stay fixed when you switch scenes.';
}
function applyStatus(state) {
  if (
    (state.sessionId && retiredSessions.has(state.sessionId)) ||
    (Number.isFinite(state.nowMs) && state.nowMs < statusStateAt)
  )
    return false;
  if (Number.isFinite(state.nowMs)) statusStateAt = state.nowMs;
  for (const id of ['bpm', 'tap', 'offset', 'offset-reset']) $(id).disabled = !state.tempo;
  $('stop').disabled = !state.blackout;
  if (!state.tempo) $('clock-status').textContent = 'Restart required';
  if (!state.blackout) $('blackout-state').textContent = 'Update required';
  applyTempo(state);
  serverState = state;
  for (let id = 1; id <= 4; id++) {
    const d = state.devices?.find((d) => towerId(d) === id);
    const el = $(`tower-${id}-status`);
    el.textContent = !d?.connected
      ? String(id)
      : !d.compatible
      ? `${id} update`
      : d.stopPending
      ? `${id} stopping`
      : String(id);
    el.className = d?.compatible && d.connected ? 'online' : d?.connected ? 'pending' : '';
    el.title = d?.error || `Tower ${id}${d?.connected ? '' : ' offline'}`;
    el.setAttribute(
      'aria-label',
      `Tower ${id}${d?.connected ? (d.compatible ? ' connected' : ' incompatible') : ' offline'}`
    );
    $(`tower-${id}-layout`).hidden = !d?.connected;
  }
  if (drag && !connectedTowers().includes(drag.id)) finishDrag();
  if (selectedTower && !connectedTowers().includes(selectedTower)) selectedTower = null;
  const midi = state.midi?.connected;
  $('midi-status').textContent = midi ? 'MIDI' : 'MIDI offline';
  $('midi-status').className = midi ? 'online' : '';
  updateSend();
  if (state.blackout && state.nowMs >= blackoutStateAt) {
    blackoutStateAt = state.nowMs;
    $('blackout-state').textContent = state.blackout.error
      ? 'Blackout unconfirmed'
      : !state.blackout.synced
      ? 'Blackout pending'
      : state.blackout.held
      ? 'Held'
      : '';
    $('blackout-state').title = state.blackout.error || 'Release resumes the current beat without reloading.';
  }
  $('play-state').textContent = state.blackout?.held
    ? 'Blackout'
    : state.devices?.some((d) => d.connected && d.stopPending)
    ? 'Stop pending'
    : state.playing
    ? 'Playing'
    : 'Stopped';
  $('draft-label').textContent = state.playing && fingerprint(program) === activeFingerprint ? 'Live' : 'Draft';
  return true;
}
function applyState(state) {
  if (!applyStatus(state)) return false;
  const changed = state.draftVersion !== draftVersion;
  if ((!initialized && editSerial === 0) || (!dirty && changed)) {
    try {
      program = validate(state.program);
      if (tempo) program.bpm = tempo.bpm;
      draftVersion = state.draftVersion;
      localTitle = scenes[program.effect].name;
      renderControls();
    } catch (e) {
      notice(e.message, true);
    }
  }
  initialized = true;
  return true;
}
async function poll() {
  if (polling) return;
  polling = true;
  try {
    const state = await api('state');
    if (!applyState(state)) return;
    if (blackoutPending) sendBlackoutEdge(blackoutPending);
    if (dirty && !previewPosting && !sending) syncDraft();
    if (state.error) notice(state.error, true);
    else if (!lastNotice || lastNotice.startsWith('Cannot reach')) {
      notice(readyTowers().length > 0 ? 'Ready' : 'No towers ready');
    }
  } catch {
    notice('Cannot reach the playground server. Preview still works; hardware status is unknown.', true);
    $('send').disabled = true;
    $('play-state').textContent = 'Server offline';
  } finally {
    polling = false;
  }
}
function sessions() {
  try {
    return JSON.parse(localStorage.getItem('lstudio-after-hours') || '{}');
  } catch {
    return {};
  }
}
function renderSessions() {
  const select = $('saved');
  select.replaceChildren(new Option('Load…', ''));
  for (const name of Object.keys(sessions())) select.add(new Option(name, name));
}
$('save').onclick = () => {
  const name = $('scene-name').value.trim() || localTitle;
  try {
    const all = sessions();
    Object.defineProperty(all, name, {
      value: structuredClone(program),
      enumerable: true,
      configurable: true,
      writable: true,
    });
    localStorage.setItem('lstudio-after-hours', JSON.stringify(all));
    renderSessions();
    notice(`Saved “${name}” in this browser.`);
  } catch {
    notice('Could not save here. Export JSON to keep this session.', true);
  }
};
$('delete').onclick = () => {
  const name = $('saved').value;
  if (!name) {
    notice('Choose a saved session to remove.');
    return;
  }
  try {
    const all = sessions();
    delete all[name];
    localStorage.setItem('lstudio-after-hours', JSON.stringify(all));
    renderSessions();
    notice(`Removed saved session “${name}”. The current draft is unchanged.`);
  } catch {
    notice('Could not update saved sessions.', true);
  }
};
$('saved').onchange = () => {
  try {
    if (!$('saved').value) return;
    localTitle = $('saved').value;
    program = { ...validate(sessions()[localTitle]), bpm: tempo?.bpm ?? program.bpm };
    edit();
  } catch (e) {
    notice(e.message, true);
  }
};
$('export').onclick = () => {
  const blob = new Blob([JSON.stringify(program, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `lstudio-${localTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
$('import').onclick = () => $('file').click();
$('file').onchange = async () => {
  try {
    const file = $('file').files[0];
    if (!file) return;
    if (file.size > 16384) throw Error('Scene files must be smaller than 16 KB.');
    program = { ...validate(JSON.parse(await file.text())), bpm: tempo?.bpm ?? program.bpm };
    localTitle = file.name.replace(/\.json$/i, '').slice(0, 40);
    edit();
    notice('Session imported. Preview it, then send when ready.');
  } catch (e) {
    notice(e.message, true);
  } finally {
    $('file').value = '';
  }
};
// Matches ClubEngine.h: randomness is a pure function of seed, beat and pixel.
function hash32(x) {
  x >>>= 0;
  x ^= x >>> 16;
  x = Math.imul(x, 0x7feb352d);
  x ^= x >>> 15;
  x = Math.imul(x, 0x846ca68b);
  return (x ^ (x >>> 16)) >>> 0;
}
function pixelAt(p, elapsed, g) {
  g %= 120; // Towers 3/4 repeat the existing 1/2 choreography.
  const beat = (Math.max(0, elapsed) * p.bpm) / 60000,
    stepFloat = beat * p.division,
    step = Math.floor(stepFloat),
    frac = stepFloat - step,
    cell = p.steps[step % 16];
  if (!cell || frac >= p.duty / 100) return null;
  const color = cell === 4 ? hash32(p.seed ^ (step >>> 0)) % 4 : cell - 1;
  let on = true,
    gain = 1;
  switch (p.effect) {
    case 1:
      on = (g + Math.floor(beat * p.motion * 4)) % (p.dash * 2) < p.dash;
      break;
    case 2: {
      const phase = ((beat * p.motion) / 4) % 2;
      const pos = (phase < 1 ? phase : 2 - phase) * 119;
      on = Math.abs(g - pos) < p.dash;
      break;
    }
    case 3:
      on = (g + Math.floor(beat * p.motion * 8)) % 120 < p.dash * 3;
      break;
    case 4:
      on = hash32(p.seed ^ (step >>> 0) ^ Math.imul(g + 1, 0x9e3779b9)) % 16 < p.dash;
      break;
    case 5:
      gain = (1 - frac / (p.duty / 100)) ** 2;
      break;
  }
  return on ? { color: p.colors[color], gain: (gain * p.brightness) / 255 } : null;
}
const canvas = $('stage'),
  ctx = canvas.getContext('2d');
function loadStripLayouts() {
  const defaults = structuredClone(defaultLayouts);
  try {
    const saved = JSON.parse(localStorage.getItem(layoutKey));
    if (Array.isArray(saved) && saved.length === 4 && saved.every(validLayout))
      return saved.map((layout) => ({ ...layout, ...clampPosition(layout.x, layout.y, layout.rotation) }));
    const old = JSON.parse(localStorage.getItem('lstudio-strip-layout-v1'));
    if (Array.isArray(old) && old.length === 2 && old.every(validRotation)) {
      old.forEach((rotation, i) => {
        defaults[i].rotation = rotation;
      });
    }
  } catch {
    /* Keep controls usable if browser storage is unavailable. */
  }
  return defaults;
}
function validRotation(value) {
  return Number.isInteger(value) && value >= -180 && value <= 180;
}
function validLayout(value) {
  return (
    value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    validRotation(value.rotation) &&
    Number.isFinite(value.x) &&
    Number.isFinite(value.y) &&
    value.x >= 0 &&
    value.x <= 1200 &&
    value.y >= 0 &&
    value.y <= 420
  );
}
function saveLayouts() {
  try {
    localStorage.setItem(layoutKey, JSON.stringify(stripLayouts));
  } catch {
    notice('Layout could not be saved in this browser.', true);
  }
}
function renderRotations() {
  stripLayouts.forEach((layout, i) => {
    $(`rotation-${i + 1}`).value = layout.rotation;
    $(`rotation-${i + 1}-range`).value = layout.rotation;
  });
}
function clampPosition(x, y, rotation) {
  const angle = (rotation * Math.PI) / 180;
  const dx = 170 * Math.abs(Math.cos(angle)) + 14;
  const dy = 170 * Math.abs(Math.sin(angle)) + 14;
  return { x: Math.max(dx, Math.min(1200 - dx, x)), y: Math.max(dy, Math.min(420 - dy, y)) };
}
function setStripRotation(index, value) {
  if (!Number.isInteger(index) || index < 0 || index > 3 || !validRotation(value)) return false;
  const layout = stripLayouts[index];
  Object.assign(layout, clampPosition(layout.x, layout.y, value), { rotation: value });
  renderRotations();
  saveLayouts();
  return true;
}
function setStripPosition(id, x, y) {
  if (![1, 2, 3, 4].includes(id) || !Number.isFinite(x) || !Number.isFinite(y)) return false;
  const layout = stripLayouts[id - 1];
  Object.assign(layout, clampPosition(x, y, layout.rotation));
  return true;
}
for (let id = 1; id <= 4; id++) {
  $(`rotation-${id}-range`).addEventListener('input', () =>
    setStripRotation(id - 1, Number($(`rotation-${id}-range`).value))
  );
  $(`rotation-${id}`).addEventListener('change', () => {
    const value = $(`rotation-${id}`).value;
    if (value.trim() === '' || !setStripRotation(id - 1, Number(value))) renderRotations();
  });
}
function canvasPoint(event) {
  const bounds = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - bounds.left) * 1200) / bounds.width,
    y: ((event.clientY - bounds.top) * 420) / bounds.height,
  };
}
function hitTower(point) {
  // Choose the closest segment; selected tower wins an exact overlap.
  let hit = null,
    nearest = 18;
  const ids = connectedTowers().sort((a, b) => Number(a === selectedTower) - Number(b === selectedTower));
  for (const id of ids) {
    const layout = stripLayouts[id - 1],
      angle = (layout.rotation * Math.PI) / 180;
    const dx = point.x - layout.x,
      dy = point.y - layout.y;
    const along = dx * Math.cos(angle) + dy * Math.sin(angle);
    const across = -dx * Math.sin(angle) + dy * Math.cos(angle);
    const distance = Math.hypot(across, Math.max(0, Math.abs(along) - 170));
    if (distance <= nearest) {
      hit = id;
      nearest = distance;
    }
  }
  return hit;
}
function finishDrag() {
  if (!drag) return;
  const pointerId = drag.pointerId;
  drag = null;
  if (canvas.hasPointerCapture(pointerId)) canvas.releasePointerCapture(pointerId);
  canvas.style.cursor = '';
  saveLayouts();
}
canvas.addEventListener('pointerdown', (event) => {
  if (event.button !== 0 || drag) return;
  const point = canvasPoint(event),
    id = hitTower(point);
  selectedTower = id;
  if (!id) return;
  event.preventDefault();
  canvas.focus();
  const layout = stripLayouts[id - 1];
  drag = { id, pointerId: event.pointerId, dx: point.x - layout.x, dy: point.y - layout.y };
  canvas.setPointerCapture(event.pointerId);
  canvas.style.cursor = 'grabbing';
});
canvas.addEventListener('pointermove', (event) => {
  const point = canvasPoint(event);
  if (!drag) {
    canvas.style.cursor = hitTower(point) ? 'grab' : '';
    return;
  }
  if (event.pointerId === drag.pointerId) setStripPosition(drag.id, point.x - drag.dx, point.y - drag.dy);
});
for (const eventName of ['pointerup', 'pointercancel', 'lostpointercapture']) {
  canvas.addEventListener(eventName, (event) => {
    if (drag?.pointerId === event.pointerId) finishDrag();
  });
}
window.addEventListener('blur', finishDrag);
window.addEventListener('pagehide', finishDrag);
canvas.addEventListener('keydown', (event) => {
  const ids = connectedTowers();
  if (!ids.length) return;
  if (/^[1-4]$/.test(event.key) && ids.includes(Number(event.key))) {
    selectedTower = Number(event.key);
    event.preventDefault();
    return;
  }
  const directions = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
  if (!directions[event.key]) return;
  event.preventDefault();
  selectedTower ??= ids[0];
  const layout = stripLayouts[selectedTower - 1],
    [dx, dy] = directions[event.key],
    step = event.shiftKey ? 10 : 2;
  setStripPosition(selectedTower, layout.x + dx * step, layout.y + dy * step);
  saveLayouts();
});
function stripPoint(index, cx, cy, length, degrees) {
  const distance = (index / 59 - 0.5) * length;
  const angle = (degrees * Math.PI) / 180;
  return { x: cx + Math.cos(angle) * distance, y: cy + Math.sin(angle) * distance };
}
function draw(now) {
  const elapsed = previewRunning ? now - previewOrigin : pausedElapsed;
  const beat = (Math.max(0, elapsed) * program.bpm) / 60000,
    step = Math.floor(beat * program.division) % 16;
  ctx.clearRect(0, 0, 1200, 420);
  for (const id of connectedTowers()) {
    const { x: cx, y: cy, rotation } = stripLayouts[id - 1];
    const point = (i) => stripPoint(i, cx, cy, 340, rotation);
    const start = point(0),
      end = point(59);
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.strokeStyle = selectedTower === id ? '#7e9568' : '#303738';
    ctx.stroke();
    ctx.fillStyle = '#929996';
    ctx.font = '13px -apple-system, sans-serif';
    ctx.fillText(String(id), start.x - 5, Math.max(14, start.y - 12));
    for (let i = 0; i < 60; i++) {
      const pt = point(i),
        pixel = elapsed < 0 ? null : pixelAt(program, elapsed, (id - 1) * 60 + i);
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 2.4, 0, Math.PI * 2);
      ctx.fillStyle = '#3e4847';
      ctx.fill();
      if (pixel && pixel.gain > 0) {
        ctx.globalAlpha = Math.min(1, pixel.gain);
        ctx.shadowBlur = 9;
        ctx.shadowColor = pixel.color;
        ctx.fillStyle = pixel.color;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
      }
    }
  }
  if (step !== lastStep) {
    document.querySelectorAll('.step').forEach((b, i) => b.classList.toggle('current', i === step));
    $('beat-label').textContent = `${(Math.floor(beat) % Math.ceil(16 / program.division)) + 1} / ${Math.ceil(
      16 / program.division
    )}`;
    lastStep = step;
  }
  requestAnimationFrame(draw);
}
renderControls();
renderRotations();
renderSessions();
updatePreviewToggle();
poll();
setInterval(poll, 500);
requestAnimationFrame(draw);
