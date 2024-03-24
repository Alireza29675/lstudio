import { ClockPayload } from "../../clock";
import { easeIn, lerp, randInt } from "../common/math";
import { black, white } from "../palettes/colors";
import { CrossMod } from "./CrossMod";

export class CornersMod extends CrossMod {
  private numHits = 0;
  private currentRow = 0;
  private currentCol = 0;

  update({ isKick }: ClockPayload) {
    this.setCrossRotation(0)
    const length = lerp(1, 30, this.midi.fader, easeIn);
    
    const allHitting = this.midi.buttons.mute;

    if (isKick) {
      this.numHits++;
      if (this.numHits > 16) {
        this.numHits = 0;
        this.currentRow = randInt(0, 1);
        this.currentCol = randInt(0, 1);
      }

      if (allHitting) {
        for (let row = 0; row < 2; row++) {
          for (let col = 0; col < 2; col++) {
            this.hit(row, col, 255, (i: number) => {
              if (i < length) return white;
              if (i > 59 - length) return white;
              return black;
            });
          }
        }
      } else {
        this.hit(this.currentRow, this.currentCol, 255, (i: number) => {
          if (i < length) return white;
          if (i > 59 - length) return white;
          return black;
        });
      }
    }

    this.updateCrosses();
  }
}