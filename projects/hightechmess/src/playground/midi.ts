import type { MidiMixController } from '../common/midimix';
import { ApiError, PlaygroundController } from './controller';
import { performance } from 'perf_hooks';

type MidiControls = Pick<MidiMixController, 'connected' | 'state' | 'onSoloButtonPressed' | 'onComboButtonPressed' | 'onButtonPressed' | 'onBankRightButtonPressed' | 'onSendAll'>;

export function attachMidi(controller: PlaygroundController, midi: MidiControls): () => void {
  let active = true;
  let soloHeld = false;
  let soloPressedAt = 0;
  let soloUsedForEffect = false;
  const pendingColumns = new Set<number>();
  controller.setMidiStatus(() => active && midi.connected);
  const selectEffect = (index: number) => {
    if (active && index >= 0 && index < 6) {
      controller.updateDraft({ ...controller.getState().program, effect: index }, 'midi');
    }
  };
  midi.onSoloButtonPressed(pressed => {
    if (!active) return;
    if (pressed && !soloHeld) {
      soloHeld = true;
      soloPressedAt = performance.now();
      soloUsedForEffect = false;
    } else if (!pressed && soloHeld) {
      soloHeld = false;
      if (!soloUsedForEffect && performance.now() - soloPressedAt <= 3000) {
        try { controller.tap(soloPressedAt); }
        catch (error) {
          // A newer browser tap may arrive during this hold. Its timestamp wins.
          if (!(error instanceof ApiError)) throw error;
        }
      }
    }
  });
  midi.onComboButtonPressed((index, pressed) => {
    if (active && soloHeld) soloUsedForEffect = true;
    if (!pressed) selectEffect(index);
  });
  midi.onButtonPressed((row, col, pressed) => {
    if (!active || row !== 0) return;
    if (pressed) {
      if (soloHeld) {
        pendingColumns.add(col);
        soloUsedForEffect = true;
      }
      else pendingColumns.delete(col);
    } else if (pendingColumns.delete(col)) selectEffect(col);
  });
  midi.onBankRightButtonPressed(pressed => { if (active) controller.setMidiBlackout(pressed); });
  const values = () => [midi.state.faders[0], midi.state.knobs[0][0], midi.state.knobs[1][0], midi.state.faders[1]];
  let lastValues = values();
  const flushControls = (force = false) => {
    if (!midi.connected) {
      controller.setMidiBlackout(false);
      soloHeld = false;
      soloUsedForEffect = false;
      pendingColumns.clear();
      return;
    }
    const next = values();
    const program = controller.getState().program;
    const fields = ['brightness', 'motion', 'duty', 'dash'] as const;
    const ranges = [[0, 255], [1, 16], [1, 100], [1, 15]];
    let changed = false;
    next.forEach((value, i) => {
      if ((force || value !== lastValues[i]) && Number.isFinite(value)) {
        const [min, max] = ranges[i];
        program[fields[i]] = Math.round(min + Math.max(0, Math.min(1, value)) * (max - min));
        changed = true;
      }
    });
    lastValues = next;
    if (changed) controller.updateDraft(program, 'midi');
  };
  const timer = setInterval(flushControls, 50);
  midi.onSendAll(() => {
    if (!active) return;
    flushControls(true);
    controller.play(controller.getState().program).catch(error => controller.reportError(error));
  });
  return () => {
    active = false;
    clearInterval(timer);
    controller.setMidiBlackout(false);
    controller.setMidiStatus(() => false);
  };
}
