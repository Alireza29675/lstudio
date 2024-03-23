import { areNumbersClose, avg } from "../mods/common/math";
import midi from "./midimix";

const MIN_FPS_SUPPORTED = 20;
const DURATION_OF_ONE_FRAME = 1000 / MIN_FPS_SUPPORTED;

class ManualBeatController {
  private hits = [0, 0, 0, 0];
  
  private delayBetweenHits = 0;
  private bpmHitStart = 0;

  constructor() {
    midi.onSoloButtonPressed((pressed) => pressed && this.hit());
  }

  get bpm() {
    return Math.floor(60000 / this.delayBetweenHits);
  }

  isKick() {
    const split = 1;
    const currentTime = Date.now();
    return Math.abs(currentTime - this.bpmHitStart) % (this.delayBetweenHits / split) < DURATION_OF_ONE_FRAME
  }

  hit() {
    const currentTime = Date.now()

    // shifting one timestamp to the top
    this.hits.push(currentTime);
    this.hits.shift();

    // first we create an array of time differences between hits
    const timeDifferences = this.hits.reduce((acc, timestamp, i, arr) => {
      if (i === 0) return acc;
      return [...acc, timestamp - arr[i - 1]];
    }, [] as number[]);

    const timeToCalculateBPM = areNumbersClose(timeDifferences);
    
    if (timeToCalculateBPM) {
      this.delayBetweenHits = avg(timeDifferences)
      this.bpmHitStart = currentTime;

      console.log(`BPM: ${this.bpm} (average of ${timeDifferences.length} hits) starting from ${this.bpmHitStart}`);
    }
  }
}

export const manualBeatController = new ManualBeatController();
