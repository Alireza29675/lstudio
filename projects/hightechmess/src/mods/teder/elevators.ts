import { black, blue, crimson, mint } from "../palettes/colors";
import { ClockPayload } from "../../clock";
import { throttle } from "lodash";
import { lerp, randItem } from "../common/math";
import chaser from 'chaser';
import { CrossMod } from "./CrossMod";
import { Color } from "@lstudio/core";

export class ElevatorsMod extends CrossMod {
  private positions = [
    chaser({ initialValue: 0, duration: 500 }),
    chaser({ initialValue: 20, duration: 500 }),
    chaser({ initialValue: 40, duration: 500 }),
    chaser({ initialValue: 0, duration: 500 })
  ]

  private color: Color = blue;

  randomizePositions = throttle(() => {
    this.positions.forEach(position => {
      position.target = randItem([0, 20, 40]);
    })
  }, 100, { trailing: false });

  switchColor = throttle(() => {
    this.color = randItem([blue, mint, crimson])
  }, 1000, { trailing: false });

  update({ isKick }: ClockPayload) {
    this.setCrossRotation(0);

    if (this.midi.buttons.mute) this.switchColor();

    if (isKick) this.randomizePositions();

    const length = Math.floor(lerp(0, 20, this.midi.fader)) * 2

    this.each((strip, stripIndex) => {
      strip.fill(black);
      strip.setBrightness(255);
      const position = Math.floor(this.positions[stripIndex].value);
      const end = Math.min(position + length, strip.length - 1);
      strip.setRangeColor(position, end, this.color);
    });
  }
}