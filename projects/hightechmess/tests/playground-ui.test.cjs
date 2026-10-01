const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const { performance } = require('node:perf_hooks');
const source = fs.readFileSync(path.join(__dirname, '../src/playground/public/app.js'), 'utf8');
const program = {
  bpm: 128,
  effect: 1,
  brightness: 64,
  duty: 70,
  division: 2,
  dash: 4,
  motion: 4,
  seed: 12345,
  colors: ['#cbfa72', '#80dbf4', '#f26aaf', '#ffffff'],
  steps: [1, 0, 1, 4, 0, 2, 0, 1, 1, 0, 4, 0, 3, 0, 1, 4],
};
const state = () => ({
  program: structuredClone(program),
  draftVersion: 1,
  playing: false,
  originMs: null,
  nowMs: 0,
  busy: false,
  devices: [
    { role: 'left', connected: true, compatible: true },
    { role: 'right', connected: true, compatible: true },
  ],
  midi: { connected: false },
});
const response = (data) => ({ ok: true, json: async () => data });
const flush = () => new Promise((resolve) => setImmediate(resolve));
function harness(fetch, overrides = {}) {
  const elements = new Map();
  class Element {
    constructor(tag = 'div') {
      this.tag = tag;
      this.children = [];
      this.style = { setProperty() {} };
      this.classList = { toggle() {}, add() {}, remove() {} };
      this.value = '';
      this.attrs = {};
      this.listeners = {};
    }
    append(...children) {
      for (const c of children) {
        if (typeof c === 'object') {
          c.parent = this;
          this.children.push(c);
        }
      }
    }
    replaceChildren(...children) {
      this.children = [];
      this.append(...children);
    }
    add(child) {
      this.append(child);
    }
    setAttribute(key, value) {
      this.attrs[key] = value;
    }
    addEventListener(name, callback) {
      this.listeners[name] = callback;
    }
    getBoundingClientRect() {
      return { left: 20, top: 30, width: 600, height: 210 };
    }
    setPointerCapture(id) {
      this.capture = id;
    }
    hasPointerCapture(id) {
      return this.capture === id;
    }
    releasePointerCapture() {
      this.capture = null;
    }
    focus() {}
    getContext() {
      return {};
    }
    querySelector(selector) {
      return this.children.find((c) => c.className === selector.slice(1)) || new Element();
    }
    get nextElementSibling() {
      return this.parent.children[this.parent.children.indexOf(this) + 1];
    }
  }
  const get = (id) => {
    if (!elements.has(id)) elements.set(id, new Element());
    return elements.get(id);
  };
  const document = {
    getElementById: get,
    createElement: (tag) => new Element(tag),
    body: new Element(),
    activeElement: null,
    addEventListener() {},
    querySelectorAll(selector) {
      if (selector === '.preset') return get('presets').children;
      if (selector === '.step') return get('steps').children;
      if (selector === '.paint-tools button') return get('paint-tools').children;
      if (selector === '.color input') return get('colors').children.map((c) => c.children[0]);
      return [];
    },
  };
  const context = vm.createContext({
    document,
    fetch,
    crypto: require('node:crypto').webcrypto,
    window: { addEventListener() {} },
    performance,
    structuredClone,
    console,
    Math,
    Number,
    Object,
    Array,
    JSON,
    Error,
    matchMedia: () => ({ matches: false }),
    setTimeout: () => 1,
    clearTimeout() {},
    setInterval() {},
    requestAnimationFrame() {},
    localStorage: { getItem: () => null, setItem() {} },
    ...overrides,
    Option: class extends Element {
      constructor(text, value) {
        super();
        this.textContent = text;
        this.value = value;
      }
    },
  });
  vm.runInContext(source, context);
  return { get, run: (code) => vm.runInContext(code, context) };
}

test('Blackout cancels Send waiting for a draft POST, with no later play request', async () => {
  let releasePreview;
  const requests = [];
  const h = harness(async (url) => {
    requests.push(url);
    if (url === '/api/preview') return new Promise((resolve) => (releasePreview = () => resolve(response(state()))));
    return response(state());
  });
  await flush();
  h.run('syncDraft()');
  const send = h.get('send').onclick();
  await h.get('stop-persistent').onclick();
  releasePreview();
  await send;
  await flush();
  assert.equal(requests.filter((p) => p === '/api/play').length, 0);
  assert.equal(requests.filter((p) => p === '/api/stop').length, 1);
  assert.equal(h.run('sending'), false);
});

test('a late Play response cannot replace Blackout UI', async () => {
  let releasePlay;
  const h = harness(async (url) =>
    url === '/api/play'
      ? new Promise((resolve) => (releasePlay = () => resolve(response({ ...state(), playing: true, originMs: 2000 }))))
      : response(state())
  );
  await flush();
  const send = h.get('send').onclick();
  await flush();
  await h.get('stop-persistent').onclick();
  releasePlay();
  await send;
  assert.equal(h.get('play-state').textContent, 'Stopped');
  assert.match(h.get('notice').textContent, /Stopped/);
});

test('initial delayed state cannot overwrite a locally edited draft', async () => {
  let releaseState;
  const h = harness(async (url) =>
    url === '/api/state'
      ? new Promise((resolve) => (releaseState = () => resolve(response(state()))))
      : response(state())
  );
  h.get('presets').children[4].onclick();
  assert.equal(h.run('program.effect'), 4);
  releaseState();
  await flush();
  assert.equal(h.run('program.effect'), 4);
});

test('import precision and canonical fingerprints agree with server validation', async () => {
  const h = harness(async () => response(state()));
  await flush();
  assert.throws(() => h.run('validate({...program,bpm:120.123})'), /decimal/);
  assert.equal(
    h.run('fingerprint(program)===fingerprint(Object.fromEntries(Object.entries(program).reverse()))'),
    true
  );
  assert.equal(
    h.run('fingerprint(program)===fingerprint({...program,colors:program.colors.map(c=>c.toUpperCase())})'),
    true
  );
});

const withTempo = (at = 1000, extra = {}) => ({
  ...state(),
  nowMs: at,
  tempo: { bpm: 120, anchorMs: 500, offsetMs: 0, revision: 1, tapCount: 0, synced: true, syncing: false, ...extra },
});

test('tap requests retain original click times through a slow previous request', async () => {
  let now = 1000;
  let releaseTap;
  const taps = [];
  const h = harness(
    async (url, options) => {
      if (url === '/api/tap') {
        taps.push(JSON.parse(options.body).atMs);
        if (taps.length === 1)
          return new Promise((resolve) => {
            releaseTap = () => resolve(response(withTempo(1100)));
          });
        return response(withTempo(1700));
      }
      return response(withTempo(1000));
    },
    { performance: { now: () => now } }
  );
  await flush();
  now = 1100;
  const first = h.get('tap').onclick();
  await flush();
  now = 1600;
  const second = h.get('tap').onclick();
  now = 1700;
  releaseTap();
  await first;
  await second;
  assert.deepEqual(taps, [1100, 1600]);
});

test('scene changes and sending preserve the independent clock anchor', async () => {
  const h = harness(async () => response(withTempo()));
  await flush();
  const anchor = h.run('previewOrigin');
  h.get('presets').children[3].onclick();
  assert.equal(h.run('previewOrigin'), anchor);
  assert.equal(h.run('program.bpm'), 120);
  await h.get('send').onclick();
  // Mapping may improve with a newer HTTP sample; the host anchor must stay fixed.
  assert.equal(h.run('tempo.anchorMs'), 500);
  assert.equal(h.run('fingerprint(program) === fingerprint({...program,bpm:200})'), true);
});

test('manual BPM and alignment post only tempo changes, without deploying the draft', async () => {
  const requests = [];
  const h = harness(async (url, options) => {
    if (options) requests.push({ url, body: JSON.parse(options.body) });
    return response(withTempo());
  });
  await flush();
  h.get('bpm').value = '132.25';
  h.get('bpm').listeners.change();
  await h.run('tempoRequests');
  h.get('offset').value = '-37';
  h.get('offset').listeners.change();
  await h.run('tempoRequests');
  await h.get('offset-reset').onclick();
  assert.deepEqual(requests, [
    { url: '/api/tempo', body: { bpm: 132.25 } },
    { url: '/api/tempo', body: { offsetMs: -37 } },
    { url: '/api/tempo', body: { offsetMs: 0 } },
  ]);
});

test('stale tempo responses cannot rewind the tap phase or progress', async () => {
  const h = harness(async () => response(withTempo()));
  await flush();
  h.run('applyState({...serverState,nowMs:2000,tempo:{...tempo,anchorMs:1800,offsetMs:25,tapCount:4,revision:2}})');
  const anchor = h.run('previewOrigin');
  h.run('applyState({...serverState,nowMs:1500,tempo:{...tempo,anchorMs:500,offsetMs:0,tapCount:2,revision:1}})');
  assert.equal(h.run('tempo.anchorMs'), 1800);
  assert.equal(h.run('previewOrigin'), anchor);
  assert.equal(h.get('offset-out').value, '+25 ms');
});

test('importing a scene preserves the running device BPM', async () => {
  const h = harness(async () => response(withTempo()));
  await flush();
  h.get('file').files = [
    { size: 1000, name: 'Other.json', text: async () => JSON.stringify({ ...program, bpm: 200, effect: 4 }) },
  ];
  await h.get('file').onchange();
  assert.equal(h.run('program.bpm'), 120);
  assert.equal(h.run('program.effect'), 4);
});

test('Send waits for pending tempo update, and Stop can cancel that wait', async () => {
  let releaseTempo;
  const requests = [];
  const h = harness(async (url) => {
    requests.push(url);
    if (url === '/api/tempo')
      return new Promise((resolve) => {
        releaseTempo = () => resolve(response(withTempo()));
      });
    return response(withTempo());
  });
  await flush();
  h.run('setTempo({offsetMs:50})');
  await flush();
  const send = h.get('send').onclick();
  await flush();
  assert.equal(requests.includes('/api/play'), false);
  await h.get('stop-persistent').onclick();
  releaseTempo();
  await send;
  assert.equal(requests.includes('/api/play'), false);
});

test('blackout release is sent before the press acknowledgement, with ordered edges', async () => {
  let releasePress;
  const requests = [];
  const h = harness(async (url, options) => {
    if (url === '/api/blackout') {
      const body = JSON.parse(options.body);
      requests.push(body);
      if (body.held)
        return new Promise((resolve) => {
          releasePress = () => resolve(response(withTempo()));
        });
    }
    return response(withTempo());
  });
  await flush();
  const press = h.run('holdBlackout(true)');
  const release = h.run('holdBlackout(false)');
  await release;
  assert.deepEqual(
    requests.map((x) => [x.held, x.sequence]),
    [
      [true, 1],
      [false, 2],
    ]
  );
  assert.equal(requests[0].clientId, requests[1].clientId);
  assert.equal(h.run('blackoutHeld'), false);
  releasePress();
  await press;
  assert.equal(h.run('blackoutHeld'), false);
});

test('failed blackout release is retried after reconnection with the same ordered edge', async () => {
  let failRelease = true;
  const edges = [];
  const h = harness(async (url, options) => {
    if (url === '/api/blackout') {
      const body = JSON.parse(options.body);
      edges.push({ ...body, keepalive: options.keepalive });
      if (!body.held && failRelease) throw Error('offline');
    }
    return response(withTempo());
  });
  await flush();
  await h.run('holdBlackout(true)');
  await h.run('holdBlackout(false)');
  assert.equal(h.run('blackoutPending.held'), false);
  failRelease = false;
  await h.run('poll()');
  await flush();
  assert.equal(edges.length, 3);
  assert.deepEqual(edges[2], edges[1]);
  assert.equal(edges[2].keepalive, true);
  assert.equal(h.run('blackoutPending'), null);
});

test('server session change resets clock mapping even after a short uptime', async () => {
  let next = { ...withTempo(1000), sessionId: 'first' };
  const h = harness(async () => response(next), { performance: { now: () => 1000 } });
  await flush();
  next = { ...withTempo(20, { anchorMs: 10 }), sessionId: 'second' };
  await h.run('poll()');
  assert.equal(h.run('tempo.anchorMs'), 10);
  assert.equal(h.run('hostOffset'), -980);
  assert.equal(h.run('previewOrigin'), 990);
});

test('strip geometry has 60 equally spaced pixels and rotates around its midpoint', async () => {
  const h = harness(async () => response(withTempo()));
  await flush();
  for (const angle of [0, 24, -52, 90, -180, 180]) {
    const points = JSON.parse(
      h.run(`JSON.stringify(Array.from({length:60},(_,i)=>stripPoint(i,440,210,340,${angle})))`)
    );
    assert.equal(new Set(points.map((p) => `${p.x},${p.y}`)).size, 60);
    assert.ok(Math.abs((points[0].x + points[59].x) / 2 - 440) < 1e-8);
    assert.ok(Math.abs((points[0].y + points[59].y) / 2 - 210) < 1e-8);
    for (let i = 1; i < 60; i++) {
      assert.ok(Math.abs(Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y) - 340 / 59) < 1e-8);
    }
    assert.ok(Math.abs(Math.hypot(points[59].x - points[0].x, points[59].y - points[0].y) - 340) < 1e-8);
    assert.ok(points.every((p) => p.x >= 0 && p.x <= 1200 && p.y >= 0 && p.y <= 420));
  }
  assert.equal(h.run('stripPoint(0,0,0,340,0).x'), -170);
  assert.equal(h.run('stripPoint(0,0,0,340,180).x'), 170);
});

test('strip rotations persist independently without altering scene, tempo or hardware', async () => {
  const saved = new Map();
  const requests = [];
  const storage = { getItem: (key) => saved.get(key) ?? null, setItem: (key, value) => saved.set(key, value) };
  const h = harness(
    async (url, options) => {
      requests.push({ url, options });
      return response(withTempo());
    },
    { localStorage: storage }
  );
  await flush();
  const before = h.run('JSON.stringify({program,tempo,editSerial,dirty})');
  h.get('rotation-1-range').value = '90';
  h.get('rotation-1-range').listeners.input();
  h.get('rotation-2').value = '-135';
  h.get('rotation-2').listeners.change();
  assert.equal(h.run('JSON.stringify({program,tempo,editSerial,dirty})'), before);
  assert.deepEqual(
    JSON.parse(saved.get('lstudio-strip-layout-v2')).map((l) => l.rotation),
    [90, -135, 24, -52]
  );
  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, '/api/state');
  const reopened = harness(async () => response(withTempo()), { localStorage: storage });
  await flush();
  assert.equal(reopened.get('rotation-1').value, 90);
  assert.equal(reopened.get('rotation-2').value, -135);
  reopened.get('presets').children[4].onclick();
  assert.deepEqual(JSON.parse(reopened.run('JSON.stringify(stripLayouts.map(l => l.rotation))')), [90, -135, 24, -52]);
});

test('invalid or unavailable rotation storage recovers without breaking controls', async () => {
  for (const stored of ['null', '{}', '[90]', '[0,181]', '[24.5,0]', '["90",0]', 'broken']) {
    const h = harness(async () => response(withTempo()), {
      localStorage: { getItem: (key) => (key === 'lstudio-strip-layout-v1' ? stored : null), setItem() {} },
    });
    await flush();
    assert.deepEqual(JSON.parse(h.run('JSON.stringify(stripLayouts.map(l => l.rotation))')), [24, -52, 24, -52]);
  }
  const h = harness(async () => response(withTempo()), {
    localStorage: {
      getItem() {
        throw Error('blocked');
      },
      setItem() {
        throw Error('blocked');
      },
    },
  });
  await flush();
  assert.doesNotThrow(() => h.run('setStripRotation(0,45)'));
  assert.equal(h.run('stripLayouts[0].rotation'), 45);
  h.get('rotation-1').value = '';
  h.get('rotation-1').listeners.change();
  assert.equal(h.run('stripLayouts[0].rotation'), 45);
  assert.equal(h.run('setStripRotation(1,Infinity)'), false);
  assert.equal(h.run('setStripRotation(1,181)'), false);
  h.get('rotation-2').value = '24.5';
  h.get('rotation-2').listeners.change();
  assert.equal(h.get('rotation-2').value, -52);
  assert.equal(h.get('rotation-2-range').value, -52);
  assert.equal(h.run('stripLayouts[1].rotation'), -52);
});

test('presets show titles only and every fixed UI target exists in the page', async () => {
  const h = harness(async () => response(withTempo()));
  await flush();
  assert.deepEqual(
    h.get('presets').children.map((b) => b.textContent),
    ['Velvet Strobe', 'Acid Steps', 'Ricochet', 'Afterimage', 'Scatterbrain', 'Low Tide']
  );
  assert.ok(h.get('presets').children.every((b) => b.children.length === 0));
  const html = fs.readFileSync(path.join(__dirname, '../src/playground/public/index.html'), 'utf8');
  for (const [, id] of source.matchAll(/\$\('([^']+)'\)/g))
    assert.ok(html.includes(`id="${id}"`), `Missing DOM target ${id}`);
});

test('layout migrates existing angles and survives sparse tower reconnects', async () => {
  const h = harness(async () => response(withTempo()), {
    localStorage: { getItem: (key) => (key === 'lstudio-strip-layout-v1' ? '[24,-34]' : null), setItem() {} },
  });
  await flush();
  assert.equal(h.run('stripLayouts[1].rotation'), -34);
  h.run('setStripPosition(3, 500, 200)');
  const layout = h.run('JSON.stringify(stripLayouts)');
  const sparse = {
    ...withTempo(),
    devices: [1, 2, 3, 4].map((id) => ({ id, connected: id === 1 || id === 3, compatible: true })),
  };
  h.run(`applyStatus(${JSON.stringify(sparse)})`);
  assert.deepEqual(JSON.parse(h.run('JSON.stringify(connectedTowers())')), [1, 3]);
  assert.equal(h.get('tower-2-layout').hidden, true);
  assert.equal(h.get('tower-3-layout').hidden, false);
  assert.equal(h.get('send').disabled, false);
  h.run(`applyStatus(${JSON.stringify({ ...sparse, devices: [] })})`);
  assert.equal(h.get('send').disabled, true);
  assert.equal(h.run('JSON.stringify(stripLayouts)'), layout);
  h.run(`applyStatus(${JSON.stringify(sparse)})`);
  assert.equal(h.run('JSON.stringify(stripLayouts)'), layout);
});

test('pointer drag maps scaled canvas coordinates without jumping and changes only layout', async () => {
  const saved = new Map(),
    requests = [];
  const h = harness(
    async (url) => {
      requests.push(url);
      return response(withTempo());
    },
    {
      localStorage: { getItem: (key) => saved.get(key) ?? null, setItem: (key, value) => saved.set(key, value) },
    }
  );
  await flush();
  const canvas = h.get('stage'),
    before = h.run('JSON.stringify({program,tempo,editSerial,dirty})');
  const event = (x, y, pointerId = 9) => ({
    clientX: x / 2 + 20,
    clientY: y / 2 + 30,
    pointerId,
    button: 0,
    preventDefault() {},
  });
  canvas.listeners.pointerdown(event(450, 210));
  assert.equal(canvas.capture, 9);
  canvas.listeners.pointermove(event(550, 230, 10));
  assert.equal(h.run('stripLayouts[0].x'), 440);
  canvas.listeners.pointermove(event(550, 230));
  assert.equal(h.run('stripLayouts[0].x'), 540);
  assert.equal(h.run('stripLayouts[0].y'), 230);
  canvas.listeners.pointerup(event(550, 230));
  assert.equal(canvas.capture, null);
  assert.equal(h.run('drag'), null);
  assert.equal(h.run('JSON.stringify({program,tempo,editSerial,dirty})'), before);
  assert.deepEqual(requests, ['/api/state']);
  const reopened = harness(async () => response(withTempo()), {
    localStorage: { getItem: (key) => saved.get(key) ?? null, setItem() {} },
  });
  await flush();
  assert.equal(reopened.run('stripLayouts[0].x'), 540);
  assert.equal(reopened.run('stripLayouts[0].y'), 230);
  canvas.listeners.pointerdown(event(540, 230));
  h.run(`applyStatus(${JSON.stringify({ ...withTempo(), devices: [] })})`);
  assert.equal(h.run('drag'), null);
  assert.equal(canvas.capture, null);
});

test('rotated bars clamp inside preview and keyboard movement persists without transport', async () => {
  const h = harness(async () => response(withTempo()));
  await flush();
  for (const angle of [-180, -90, -52, 0, 24, 90, 180]) {
    h.run(`setStripRotation(0,${angle}); setStripPosition(1,-999,999)`);
    const points = JSON.parse(
      h.run(
        'JSON.stringify([0,59].map(i=>stripPoint(i,stripLayouts[0].x,stripLayouts[0].y,340,stripLayouts[0].rotation)))'
      )
    );
    assert.ok(points.every((p) => p.x >= 0 && p.x <= 1200 && p.y >= 0 && p.y <= 420));
  }
  const canvas = h.get('stage');
  h.run('setStripPosition(1,440,210)');
  canvas.listeners.keydown({ key: 'ArrowRight', shiftKey: true, preventDefault() {} });
  assert.equal(h.run('stripLayouts[0].x'), 450);
  assert.equal(h.run('setStripPosition(5,100,100)'), false);
  assert.equal(h.run('setStripPosition(1,Infinity,100)'), false);
  assert.equal(h.run('validLayout({x:-1,y:0,rotation:0})'), false);
  assert.equal(h.run('validLayout({x:0,y:0,rotation:0.5})'), false);
});

test('late snapshots cannot resurrect disconnected towers or rewind the draft', async () => {
  const h = harness(async () => response(withTempo(0)));
  await flush();
  const current = { ...withTempo(200), devices: [], draftVersion: 3, program: { ...program, effect: 3 } };
  const stale = {
    ...withTempo(100),
    devices: [{ id: 3, connected: true, compatible: true }],
    playing: true,
    draftVersion: 2,
  };
  h.run(`applyState(${JSON.stringify(current)});applyState(${JSON.stringify(stale)})`);
  assert.equal(h.get('send').disabled, true);
  assert.equal(h.get('tower-3-layout').hidden, true);
  assert.equal(h.get('play-state').textContent, 'Stopped');
  assert.equal(h.run('program.effect'), 3);
  assert.equal(h.run('draftVersion'), 3);
});

test('late response from the retired server cannot undo a fresh session', async () => {
  let next = { ...withTempo(1000), sessionId: 'old' };
  const h = harness(async () => response(next));
  await flush();
  next = { ...withTempo(10), sessionId: 'new', devices: [] };
  await h.run('poll()');
  next = { ...withTempo(1100), sessionId: 'old' };
  await h.run('poll()');
  assert.equal(h.run('serverSessionId'), 'new');
  assert.equal(h.get('send').disabled, true);
  assert.deepEqual(JSON.parse(h.run('JSON.stringify(connectedTowers())')), []);
});
