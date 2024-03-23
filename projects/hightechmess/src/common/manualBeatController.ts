import midi from "./midimix";

class ManualBeatController {
  private hitTimes: number[] = [];
  private intervalId: NodeJS.Timeout | null = null;
  public isKick: boolean = false;

  private kickDuration: number = 60;
  private latencyOffset: number = 120;

  constructor() {
    this.generateKick = this.generateKick.bind(this);
    midi.onSoloButtonPressed((pressed) => pressed && this.hit());
  }

  hit() {
    const currentTime = Date.now() - this.latencyOffset;
    this.hitTimes.push(currentTime);

    if (this.hitTimes.length > 3) {
      this.hitTimes.shift();
    }

    if (this.hitTimes.length >= 3) {
      this.calculateBPM();
    }
  }

  private calculateBPM() {
    const timeDifferences = [];
    for (let i = 1; i < this.hitTimes.length; i++) {
      timeDifferences.push(this.hitTimes[i] - this.hitTimes[i - 1]);
    }

    const averageDifference = timeDifferences.reduce((sum, diff) => sum + diff, 0) / timeDifferences.length;
    const bpm = 60000 / averageDifference;

    this.restartKicking(bpm);
  }

  private restartKicking(bpm: number) {
    if (this.intervalId) clearInterval(this.intervalId);

    const kickInterval = 60000 / bpm;
    this.intervalId = setInterval(this.generateKick, kickInterval); 
  }

  private generateKick() {
    this.isKick = true;
    midi.setBankButton('left', true);

    setTimeout(() => {
      this.isKick = false;
      midi.setBankButton('left', false);
    }, this.kickDuration);
  }

  stopKicking() {
    if (this.intervalId) clearInterval(this.intervalId);
    this.intervalId = null;
    this.hitTimes = [];
  }
}

export const manualBeatController = new ManualBeatController();
