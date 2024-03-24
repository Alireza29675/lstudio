import { ClockPayload } from "../../clock";
import { randInt, randItem } from "../common/math";
import { black, blue, crimson, white } from "../palettes/colors";
import { CrossMod } from "./CrossMod";

export class TurbinMod extends CrossMod {
  private numHits = 0;
  private currentRow = 0;
  private currentCol = 0;
  private firstHalf = true;
  private color = white;

  update({ isKick }: ClockPayload) {
    this.setCrossRotation(0)
    
    if (isKick) {
      this.numHits++;
      if (this.numHits > 16) {
        const allColors = [white, blue, crimson];
        const colorsCount = Math.floor(this.midi.knobs.low * allColors.length) + 1;

        this.numHits = 0;
        this.currentRow = randInt(0, 1);
        this.currentCol = randInt(0, 1);
        this.firstHalf = !this.firstHalf;
        this.color = randItem(allColors.slice(0, colorsCount))
      }

      this.hit(this.currentRow, this.currentCol, 255, (i: number) => {
        if (this.firstHalf && i < 30 || !this.firstHalf && i > 29) return this.color;
        return black;
      });
    }

    this.updateCrosses();
  }
}