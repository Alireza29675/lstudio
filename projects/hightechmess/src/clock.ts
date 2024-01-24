import { Clock } from "@lstudio/core";

export type ClockPayload = {
  frameIndex: number,
}

class FPSClock extends Clock<ClockPayload> {
  private interval?: number

  constructor(readonly fps: number) {
    super();
  }

  public start(): void {
    const ms = Math.round(1000 / this.fps)
    this.interval = setInterval(this.tick.bind(this), ms)
  }

  public stop(): void {
    clearInterval(this.interval)
  }
}

export const clock = new FPSClock(30)