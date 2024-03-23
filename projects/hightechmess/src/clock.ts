import { Clock } from '@lstudio/core'
import { ExternalMidiInstrument } from './common/midi-instrument'
import { manualBeatController } from './common/manualBeatController'

export type ClockPayload = {
  index: number,
  angle: number,
  isKick: boolean,
  isSnare: boolean,
}
export class MidiConnectedClock extends Clock<ClockPayload> {
  private interval?: NodeJS.Timeout
  private index: number = 0
  private instrument = new ExternalMidiInstrument(['Rubix', 'MC-707'])

  constructor(private readonly fps: number) {
    super();
  }

  get isKick(): boolean {
    if (!this.instrument.isConnected) {
      return manualBeatController.isKick
    }

    return this.instrument.data.isKick
  }

  get isSnare(): boolean {
    if (!this.instrument.isConnected) {
      return this.index % 4 === 0
    }

    return this.instrument.data.isSnare
  }

  public start(): void {
    const ms = Math.round(1000 / this.fps)
    this.interval = setInterval(() => {
      this.index++;
      const angle = (this.index * Math.PI / 100) % (Math.PI * 2);

      this.tick({
        index: this.index,
        angle,
        isKick: this.isKick,
        isSnare: this.isSnare,
      })
    }, ms)
  }

  public stop(): void {
    clearInterval(this.interval)
  }
}

export const clock = new MidiConnectedClock(30)
