import { ClockPayload } from "../../clock";
import { randInt } from "../common/math";
import { black, white } from "../palettes/colors";
import { CrossMod } from "./CrossMod";

export class BuildUpMod extends CrossMod {
  private numHits = 0;
  private currentRow = 0;
  private currentCol = 0;

  update({ isKick }: ClockPayload) {
    this.setCrossRotation(0)
    
    if (isKick) {
      this.numHits++;
      if (this.numHits > 16) {
        this.numHits = 0;
        this.currentRow = randInt(0, 1);
        this.currentCol = randInt(0, 1);
      }

      this.hit(this.currentRow, this.currentCol, 255, (i: number) => {
        if (i < 4) return white;
        if (i > 55) return white;
        return black;
      });
    }

    this.updateCrosses();
  }
}