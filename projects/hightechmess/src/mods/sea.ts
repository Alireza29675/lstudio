import { State } from "../state";
import { black, grey, red, white } from "./palettes/colors";
import { OctaCoreMod } from "./common/OctaCoreMod";

let i = 0;

const drawLine = (strip: State['strips'][number], start: number, offset: number) => {
  start = Math.floor(start)
  const len = Math.floor(Math.sin((i / 10 - offset)) * 6) + 7
  for (let j = start; j < start+len; j++) {
    strip.leds[j % 60] = red;
  }
}

export class SeaMod extends OctaCoreMod {
  init() {
    this.state.palette = [
      black,
      white,
      grey,
      red,
    ]

    this.state.strips[0].rotation = 10;
    this.state.strips[1].rotation = 10;
    this.state.strips[2].rotation = 10;
    this.state.strips[3].rotation = 10;
  }

  update() {
    i += 0.5;

    this.state.strips.forEach((strip, index) => {
      strip.leds.fill(black);
      
      drawLine(strip, i + index * 10, 0);
      drawLine(strip, i + 20 + index * 10, Math.PI/2);
      drawLine(strip, i + 40 + index * 10, Math.PI);
    })
  }
}

