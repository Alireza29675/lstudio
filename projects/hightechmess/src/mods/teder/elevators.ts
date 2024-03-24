import { black, blue } from "../palettes/colors";
import { ClockPayload } from "../../clock";
import { throttle } from "lodash";
import { lerp, randItem } from "../common/math";
import chaser from 'chaser';
import { CrossMod } from "./CrossMod";

export class ElevatorsMod extends CrossMod {
  private positions = [
    chaser({ initialValue: 0, duration: 500 }),
    chaser({ initialValue: 20, duration: 500 }),
    chaser({ initialValue: 40, duration: 500 }),
    chaser({ initialValue: 0, duration: 500 })
  ]

  randomizeColors = throttle(() => {
    this.positions.forEach(position => {
      position.target = randItem([0, 20, 40]);
    })
  }, 100, { trailing: false });

  update({ isKick }: ClockPayload) {
    this.setCrossRotation(0);

    if (isKick) this.randomizeColors();

    const length = Math.floor(lerp(0, 20, this.midi.fader)) * 2

    this.each((strip, stripIndex) => {
      strip.fill(black);
      strip.setBrightness(255);
      const position = Math.floor(this.positions[stripIndex].value);
      const end = Math.min(position + length, strip.length - 1);
      strip.setRangeColor(position, end, blue);
    });
  }
}