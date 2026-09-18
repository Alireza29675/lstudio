# hightechmess

Live controller for the OctaCore hardware.

## Configuration

Copy the environment template:

```bash
cp .env.sample .env
```

By default the project expects four controllers:

```dotenv
OCTACORE_HOSTS=octacore-1.local,octacore-2.local,octacore-3.local,octacore-4.local
OCTACORE_WEBSOCKET_PORT=81
```

Hosts are ordered to match `state.strips[0..3]`. IP addresses also work.

## Run

From the repository root:

```bash
pnpm install
pnpm dev
```

Then in another terminal:

```bash
cd projects/hightechmess
pnpm start
```

The project clock starts even when some OctaCore devices are offline. Each
controller reconnects independently and receives a full state snapshot after
reconnecting.

## AKAI MIDImix

The controller searches for MIDI input/output ports whose name contains
`MIDI Mix`.

The eight columns map to the available mods. Each selected mod gets:

- high/mid/low knob
- mute and rec buttons
- channel fader
- shared master fader

The combo button selects a mod and the selected column lights up.

The Solo button is also used for manual beat tapping when no supported external
MIDI instrument is connected.
