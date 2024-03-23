import { areNumbersClose, avg, lerp } from "../mods/common/math";
import midi from "./midimix";

const MIN_FPS_SUPPORTED = 20;
const DURATION_OF_ONE_FRAME = 1000 / MIN_FPS_SUPPORTED;

class ManualBeatController {
  private hits = [0, 0, 0, 0];
  
  private isKicking = false;
  private delayBetweenHits = 0;
  private bpmHitStart = 0;

  constructor() {
    midi.onSoloButtonPressed((pressed) => pressed && this.hit());
    midi.onBankRightButtonPressed((pressed) => {
      if (pressed) {
        this.isKicking = false
        midi.setBankButton('right', false)
      }
    });
  }

  get bpm() {
    return Math.floor(60000 / this.delayBetweenHits);
  }

  isKick() {
    if (!this.isKicking) return false;
    const split = Math.floor(lerp(1, 4.99, midi.state.masterFader));
    const currentTime = Date.now();
    const isKick = Math.abs(currentTime - this.bpmHitStart) % (this.delayBetweenHits / split) < DURATION_OF_ONE_FRAME;
    midi.setBankButton('right', isKick)
    return isKick
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
      this.isKicking = true;

      console.log(`🚨 BPM: ${this.bpm}`);
    }
  }
}

export const manualBeatController = new ManualBeatController();
