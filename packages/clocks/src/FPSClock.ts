import { Clock } from '@lstudio/core'

export class FPSClock extends Clock<{
  frameIndex: number,
}> {
  private interval?: NodeJS.Timeout
  private frameCursor: number = 0

  constructor(private readonly fps: number) {
    super();
  }

  public start(): void {
    const ms = Math.round(1000 / this.fps)
    this.interval = setInterval(() => {
      this.frameCursor += 1;
      this.tick({ frameIndex: this.frameCursor })
    }, ms)
  }

  public stop(): void {
    clearInterval(this.interval)
  }
}
