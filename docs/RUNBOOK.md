# Tower controller runbook

## Default: After Hours playground

Last verified:2026-09-18. Towers1/2/3 numbered firmware uploaded and hash-verified; correct named HELLO identities confirmed. Latest live app check: towers2/3 ready, tempo/blackout synchronized and MIDI connected with1/4 absent. All63 controller/UI/recovery tests and all6 firmware builds passed. Optical timing remains unmeasured.

From this repository root, `pnpm --filter @projects/hightechmess start` opens the
server at http://127.0.0.1:3210 (loopback only). Open that URL in a browser.
On this Mac use Node22; direct startup is:

```sh
cd projects/hightechmess
/Users/alireza/.local/bin/node node_modules/ts-node/dist/bin.js src/playground/server.ts
```

Stop any old controller before starting the playground. `playground` is an
alias; `dev` restarts this same entry. The former frame-streaming app is now
explicitly `pnpm --filter @projects/hightechmess start:legacy`. Do not run both.

Connected towers need club protocolv2 firmware. Old firmware ignores HELLO and is
shown as incompatible; there is no automatic frame-streaming fallback. Draft
preview/save/import work without boards. Send captures the currently connected,
compatible, Stop-confirmed towers (at least one), validates and stages the full
pattern on that group, samples clocks, then schedules and confirms a common start.
Missing towers never block other towers. A tower discovered during playback is
stopped and gets the current clock/blackout state, then waits for the next Send.
Matching reconnects retain playback; a rebooted or outdated tower stops individually.
Stop playback cancels in-flight sends; disconnected boards retain stop intent until
reconnection and confirmation. Hold blackout is a separate momentary output mute;
release resumes the current phase without staging. Tempo/alignment updates send
automatically and survive effect changes and permanent stops. Startup clears any compatible board's previous
playback/pending start. Browser closure leaves deployed playback running.

The local server exposes fixed static files and a validated JSON API; it is not
a LAN-facing service. Endpoint overrides below still apply. Native MIDI is
optional and retried. Manual/tap BPM is supported; external MIDI Clock is not.
Save sessions/export JSON before restarting because the current server draft and
beat clock are in memory. After restart set BPM/tap alignment again. Stored browser sessions survive restarts.

[CONTROLS.md](CONTROLS.md) is the canonical new effect/MIDI guide.
Firmware contract: `../OctaCore/CLUB-PROTOCOL.md` in the sibling repository.
The sections below preserve the recovery setup and legacy streaming details.

The current local launch is a detached process recorded in ignored
`logs/playground.pid`, with output in `logs/playground.log`. Verify that PID
using `ps -p PID -o command=` before stopping it with `kill -TERM PID`.
For a normal foreground launch, Ctrl-C stops the server. Never start a second
instance while port3210 is owned by the existing one.



Last verified: 2026-09-18 (local build, typecheck, mocked MIDI and loopback WebSocket tests).

## Prerequisites and install

Run commands from the `lstudio` repository root. Verified with Node 22.23.1,
pnpm 9.15.9 and macOS Command Line Tools. The frozen lockfile is pnpm version 9.
The native `midi` package must be rebuilt if you change Node major versions.

```sh
DEVELOPER_DIR=/Library/Developer/CommandLineTools npx --yes pnpm@9.15.9 install --frozen-lockfile
pnpm --filter @lstudio/core --filter @lstudio/clocks --filter @lstudio/outputs build
```

The `DEVELOPER_DIR` prefix is a per-command macOS override; it neither changes
the global Xcode selection nor accepts an Xcode license. Omit it on other OSes.
Keep the lockfile; no dependency upgrades are required for this restoration.

## Checks without hardware output

```sh
pnpm --filter @projects/hightechmess typecheck
pnpm --filter @projects/hightechmess lint
pnpm --filter @projects/hightechmess test
```

Tests use only loopback WebSockets and mocked MIDI. They verify left/right
mapping, one shared tick, a missing board, palette changes, full-state replay,
silent-peer heartbeat recovery, no servo frames, and MIDI reconnect behavior.
An isolated child process also runs the real `ts-node` entry point and preset
graph, with native MIDI replaced and WebSockets restricted to loopback. Tests
do not touch real MIDI ports, send to boards, or write the control cache.

Read-only MIDI enumeration (does not open a port or send LED messages):

```sh
cd projects/hightechmess
node -e 'const m=require("midi"); for (const kind of ["Input","Output"]) {const p=new m[kind](); for(let i=0;i<p.getPortCount();i++) console.log(kind,p.getPortName(i));}'
```

The local Mac enumerated `MIDI Mix` for both input and output. Both boards were
subsequently flashed and their LAN `.local` names and WebSocket pongs verified.
After the dim lighting test, the user requested the live app. The controller now opens
both MIDI Mix ports and connects to both boards; individual physical gestures
are the next interactive check. See [CONTROLS.md](CONTROLS.md) for the actual
preset and control assignments.

## Start with the hardware ready

The boards must run the paired left/right OctaCore firmware on the same LAN as
the Mac. Configure Wi-Fi in that firmware's private local settings and flash
each board with its matching role. Use the firmware runbook for that procedure.
Confirm LED wiring and power before starting: the selected preset can immediately
light LEDs, and some existing presets use brightness 255. No servo frame is sent.

From the repository root:

```sh
pnpm --filter @projects/hightechmess start:legacy
```

On this Mac, the verified Node22 binary is `/Users/alireza/.local/bin/node`.
If a Terminal shell selects Node24 instead, run the existing entry directly:

```sh
cd projects/hightechmess
/Users/alireza/.local/bin/node node_modules/ts-node/dist/bin.js src/index.ts
```

Run only one instance. Before starting another, stop the existing controller
with Ctrl-C in its Terminal. The current launch writes output to the ignored
`logs/controller.log`; its PID is recorded in ignored `logs/controller.pid`.
Verify a recorded PID still belongs to this controller before using it to stop
anything. These runtime files are not a permanent service manager.

The default addresses are `ws://octacore-left.local:81` and
`ws://octacore-right.local:81`. The clock starts even if one board is absent.
Connection logs identify each endpoint. Available boards receive current state;
every reconnect resends palette, brightness and pixels. Heartbeat pings occur
every 10 seconds; an unanswered ping causes termination on the next check,
followed by a reconnect after 3 seconds.

The existing four virtual strips are intentional: some presets use slots 2 and
3, whose visuals are not output in this two-board setup. The master MIDI fader
controls beat subdivision, not global brightness. Dedicated combo-button release
or SOLO-modified MUTE release selects a preset; the latter remembers SOLO at
press time so either release order works. Terminal prints `[Preset]` with the
column and name when selection changes. Ordinary MUTE preserves preset effects.
SOLO taps tempo and BANK RIGHT stops it. Cached knobs/faders live in
the gitignored `projects/hightechmess/src/common/.cache/midi-state.json`.

## Discovery and endpoint overrides

The playground probes four stable tower IDs. Their default hosts are
`octacore-1.local` through `octacore-4.local`, on WebSocket port 81. Towers 1 and 2
also try the existing `octacore-left.local` and `octacore-right.local` aliases,
respectively, so the current two boards do not require a firmware change.
IPv4 DNS resolution completes before the 3-second WebSocket handshake timer starts.
Only one lookup per tower and one native lookup per hostname can remain pending;
retries wait for that lookup to settle instead of adding resolver work. Successful
addresses are cached for 30 seconds and cleared on connection errors. Failed
resolution or connections retry after 3 seconds, rotating through that tower's
candidate addresses. An absent hostname may therefore wait for the operating
system's DNS timeout before its legacy alias is tried. The tower identity
reported by firmware must match the configured ID; addresses do not assign identity.

Set `OCTACORE_1_URL` through `OCTACORE_4_URL` for explicit addresses. Each override
disables alias fallback for that tower. Existing `OCTACORE_LEFT_URL` and
`OCTACORE_RIGHT_URL` remain valid aliases for 1 and 2; numbered variables take
precedence. For example, from the repository root:

```sh
OCTACORE_3_URL=ws://192.168.1.52:81 pnpm --filter @projects/hightechmess start
```

No configuration is needed to leave 3 or 4 absent. All four statuses remain visible;
only connected towers are previewed and included in the next Send. Firmware keeps
the existing paired visual arrangement: 1/3 use one lane and 2/4 the other. Global
Stop remembers stop intent for disconnected prior participants, but never-seen
optional towers do not create an unconfirmed blackout. A Send with no ready towers
returns an error while draft and tempo editing remain available.

Numbered roster behavior was verified with isolated loopback boards on 2026-09-18;
the live server and hardware were not changed by these tests.

The playground resolves board hostnames using IPv4 (`family: 4`). These ESP32
targets advertise IPv4 addresses; an unresolved mDNS IPv6/AAAA lookup can otherwise
delay the connection past its handshake timeout. Explicit IPv6 endpoints are not
supported for the playground. This setting does not change legacy streaming.

On macOS, use these diagnostic commands after flashing; stop browsing with Ctrl-C:

```sh
dns-sd -G v4 octacore-left.local
dns-sd -G v4 octacore-right.local
```

Multicast DNS requires local multicast reachability. Guest Wi-Fi, client isolation,
VPNs and routed VLANs can prevent it. Use your router's DHCP lease list to find
board IPs and override either endpoint without editing source:

```sh
OCTACORE_LEFT_URL=ws://192.168.1.50:81 OCTACORE_RIGHT_URL=ws://192.168.1.51:81 pnpm --filter @projects/hightechmess start:legacy
```

Replace the example IPs with the actual leases. Both variables are optional;
unset variables keep the `.local` default. URLs must use `ws://` or `wss://` and
must not contain credentials or fragments. The ESP32 firmware uses plain `ws://`.
The controller does not read `.env` automatically or need your Wi-Fi password.
Only run one board per left/right hostname to avoid name collisions.

## Stop and recover

- Ctrl-C stops the controller. LEDs may retain the last frame; power down the LED
  supply when a definite off state is needed. Servo remains disabled in firmware.
- A missing MIDI input/output is retried independently every 3 seconds. Desired
  controller light state is replayed when MIDI output reconnects. A rapid unplug
  and replug entirely between polls may require restarting the process; this
  native-driver case still needs physical verification.
- If native MIDI cannot load after changing Node versions, repeat installation
  and `DEVELOPER_DIR=/Library/Developer/CommandLineTools npx --yes pnpm@9.15.9 rebuild midi`
  with the selected Node version. Do not start the full app merely to diagnose it.
- To undo endpoint overrides, unset `OCTACORE_LEFT_URL` and `OCTACORE_RIGHT_URL`.
  Reverting source does not restore flashed firmware; use the firmware runbook.

## Build limits

Shared core/clocks/outputs builds, controller typecheck, lint and recovery tests pass. Playground protocol and UI regression tests are included in the same test command. The existing
controller Rollup build exits successfully but warns about its CommonJS TypeScript
configuration and declaration inference in `createChaser`. Its generated bundles
are not the supported startup path; use the existing `ts-node`-based `start`
command above. The shared web-output UMD build warns about React's global name.
These packaging warnings were not hidden by weakening compiler settings.
