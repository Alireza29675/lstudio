import { OctaCoreMod } from "../common/OctaCoreMod";
import { black, purple, pink, darkBlue, white } from "../palettes/colors";
import { ClockPayload } from "../../clock";
import { throttle } from "lodash";
import { lerp, randItem } from "../common/math";
import chaser from 'chaser';

export class ZeroSumMod extends OctaCoreMod {
  private positions = [
    chaser({ initialValue: 0, duration: 1000 }),
    chaser({ initialValue: 20, duration: 800 }),
    chaser({ initialValue: 40, duration: 600 }),
    chaser({ initialValue: 0, duration: 500 })
  ]

  init() {
    this.setPalette([
      black,
      purple,
      pink,
      white,
      darkBlue
    ])
    
    this.setBrightness(255);
    this.fill(pink);

    this.setRotation(25);
  }

  randomizeColors = throttle(() => {
    this.positions.forEach(position => {
      position.target = randItem([0, 20, 40]);
    })
  }, 100, { trailing: false });

  update({ isKick }: ClockPayload) {
    if (isKick) this.randomizeColors();

    const length = Math.floor(lerp(0, 20, this.midi.fader)) * 2

    this.each((strip, stripIndex) => {
      strip.fill(black);
      const position = Math.floor(this.positions[stripIndex].value);
      const end = Math.min(position + length, strip.length - 1);
      strip.setRangeColor(position, end, pink);
    });
  }
}