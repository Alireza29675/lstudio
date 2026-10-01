# LStudio After Hours

The new default app is a browser playground at **http://127.0.0.1:3210**.
The old Daylight/weather bank is retired from the default experience.

## Make a scene

1. Choose a preset from the top row.
2. Set **BPM (40–240)**, or tap **Tap / T** four times. The latest four clicks supply three averaged intervals; the last click anchors the beat. Each following tap updates that rolling average and automatically sends BPM plus alignment to connected compatible towers. Choose 1,2,or4 steps per beat. A16-step loop is therefore16,8,or4 beats long.
3. Choose Rest, 1/2/3, or Random, then click steps to paint the rhythm. Click a step with the same paint again to clear it. RANDOM chooses among all four palette colors on each hit; Randomize changes the repeatable seed.
4. Pick colors and shape the intensity, gate length, motion and dash width. Gate length controls how much of each step stays lit. Motion affects the moving patterns; dash width also controls spark density.
5. The preview shows each connected tower as a straight, 60-pixel strip, numbered **1–4**. Drag a strip to match its position on your stands; set its angle below the preview using the slider or degree field (whole degrees, −180° to 180°; positive rotates clockwise). Positions and angles save automatically by tower ID in this browser, independently of presets and sessions. Existing Left/Right angles migrate to towers 1/2. Disconnecting a tower hides its preview while retaining its layout. These controls only position the preview. The preview uses the firmware's exact effect formulas, but physical brightness and color vary with the LEDs.
6. With at least one compatible tower ready, **Send & play** loads the pattern onto the ready towers, then schedules a shared start. Towers 1–4 are optional; absent towers do not block Send. The group is fixed when Send begins. A newly connected tower stays stopped until the next Send. The initial lead is about 2 seconds to confirm the group's commits; changes while playing land on a future beat. The16-step pattern loops locally through brief Wi-Fi loss. Effect/color/intensity edits remain a draft until sent again. Tempo and alignment are independent and send automatically.
7. **Hold blackout** (or MIDI BANK RIGHT) blacks out only while held. Release reveals the current beat immediately, without loading the scene again. Wi-Fi transit still affects button response. **Stop** stays off until the next Send & play and cancels pending sends. Offline boards cannot receive either action until reconnected; confirmation status reflects this.

Closing the browser leaves the server and any deployed pattern running. Stopping
the server requests blackout; a completely disconnected board may continue its
local loop until a controller reconnects or it is powered down. Restart boots black.

## Starting scenes

| Scene | Character |
|---|---|
| Velvet Strobe | Tight neon flashes with intentional gaps and occasional random accents |
| Acid Steps | Lime/cyan/pink dashed chase, broken into a syncopated groove |
| Ricochet | An icy beam bouncing across the combined left/right strip |
| Afterimage | Broad rotating violet bands with longer color phrases |
| Scatterbrain | Warm scattered sparks that change exactly on the step grid |
| Low Tide | A slower color pulse with a soft squared fade |

Towers 1 and 3 share one visual lane; towers 2 and 4 share the other, preserving the original paired choreography. Each tower still has its own identity, position and angle.

The six buttons load curated starting settings without changing the beat clock. MIDI effect selection changes
the renderer while preserving your current palette and rhythm.

## MIDI Mix

- **SOLO + MUTE1–6:** choose the corresponding effect for the draft. Either release order works. Dedicated legacy solo-note messages work too.
- **SOLO taps:** four taps set BPM and phase automatically. Press timing is captured; release distinguishes a tap from an effect-selection chord. Browser **T** also taps tempo when a text field is not focused.
- **Fader1:** intensity; **top knob,column1:** motion.
- **Middle knob,column1:** gate length; **fader2:** dash width/spark density.
- **BANK RIGHT:** hold to black out; release to resume on the existing beat.
- **SEND ALL:** applies the current hardware knob/fader positions to the draft, then runs **Send & play** once. The factory MIDI map emits a full snapshot of 33 continuous controls; the app recognizes that complete burst. Captured on this MIDI Mix on2026-09-18:33messages in3ms. Custom MIDI mappings need separate verification. [Akai SEND ALL description](https://cdn.inmusicbrands.com/akai/attachments/MIDIMIX/MIDImix-UserGuide-v1.0.pdf).
- Effect and parameter edits change the preview/draft until Send & play or SEND ALL. Tempo/alignment changes send automatically.

This version has manual and tap BPM. It does not follow external MIDI Clock.
Disconnected MIDI is retried; all browser controls remain usable without it.

## Save and share

Expand **Sessions**, name a session and Save it in this browser. Load it from the menu. Export JSON
makes a portable copy; Import JSON validates a pattern before loading. These
operations do not send data to the LEDs or change the running tempo. Imported/saved BPM values do not replace the independent device clock. Sessions stay on this Mac/browser;
no cloud service is involved. Delete removes the selected saved entry, leaving
the current draft intact.

## Timing and firmware

Requires club protocol v2 on each participating ESP32. The UI enables Send when
at least one connected tower is compatible and has confirmed permanent Stop.
Missing, mismatched or Stop-pending towers are excluded from that Send. It never silently falls
back to per-frame streaming. Firmware has been built and tested separately;
physical flashing and timing verification are separate steps.

The device clock survives scene changes and Stop. **Offset**
shifts it up to250ms earlier or later; positive values delay the beat. Reset
returns to the tap. Manual BPM changes preserve the current beat position.
Connected compatible towers acknowledge clock updates separately; **Synced** means
all of those towers acknowledged the current revision. No connected towers means
there is no confirmed device synchronization. An unsynced clock is shown explicitly.

A returning tower with the current deployed revision retains playback. A restarted
or outdated tower is stopped individually and waits for the next Send. Stop also
remembers disconnected prior participants and confirms their blackout on return.

Clock updates use measured host/device offsets, with recent samples reused for
responsive taps. There is no continuous clock-drift correction. Long-session
relative drift needs physical measurement; tap again to realign. Firmware
updates and optical latency measurements remain separate from software tests.

See [RUNBOOK.md](RUNBOOK.md) for install, startup and recovery.
