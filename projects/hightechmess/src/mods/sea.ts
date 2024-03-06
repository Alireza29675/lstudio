import { Color, Mod } from "@lstudio/core"
import { ClockPayloadType } from "../clock";
import { State } from "../state";

const black = new Color('#000000')
const seaBlue = new Color('#ffffff')

let i = 0;

const drawLine = (strip: State['strips'][number], start: number, offset: number) => {
  const len = Math.floor(Math.sin((i / 10 - offset)) * 6) + 7
  for (let j = start; j < start+len; j++) {
    strip.leds[j % 60] = seaBlue;
  }
}

export class SeaMod implements Mod<ClockPayloadType, State> {
  update(state: State) {
    i++
    
    const strip = state.strips[1];
    strip.leds.fill(black)

    strip.rotation = 90;
    
    drawLine(strip, i, 0);
    drawLine(strip, i + 20, Math.PI/2);
    drawLine(strip, i + 40, Math.PI);

    return {
      ...state,
    }
  }
}

