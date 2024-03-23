import { ClockPayload } from "../../clock";
import { randInt } from "../common/math";
import {  white } from "../palettes/colors";
import { CrossMod } from "./CrossMod";

export class HeavyStrobeMod extends CrossMod {
  private numHits = 0;
  private currentRow = 0;
  private currentCol = 0;

  update({ isKick }: ClockPayload) {
    this.setCrossRotation(0)
    this.fill(white);
    
    if (isKick) {
      this.numHits++;
      if (this.numHits > 16) {
        this.numHits = 0;
        this.currentRow = randInt(0, 1);
        this.currentCol = randInt(0, 1);
      }

      this.hit(this.currentRow, this.currentCol, 255);
    }

    this.updateCrosses();
  }
}