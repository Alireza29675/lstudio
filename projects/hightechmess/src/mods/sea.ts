import { Mod } from "@lstudio/core"
import { ClockPayload } from "../clock";
import { State } from "../state";
import { threeColoredSquaresPalette } from "./palettes/three-colored-squares";

let i = 0;

const drawLine = (strip: State['strips'][number], start: number, offset: number) => {
  start = Math.floor(start)
  const len = Math.floor(Math.sin((i / 10 - offset)) * 6) + 7
  for (let j = start; j < start+len; j++) {
    strip.leds[j % 60] = 4;
  }
}

export class SeaMod implements Mod<ClockPayload, State> {
  init(state: State): State {
    state.palette = threeColoredSquaresPalette

    state.strips[0].rotation = 10;
    state.strips[1].rotation = 10;
    state.strips[2].rotation = 10;
    state.strips[3].rotation = 10;

    return {
      ...state,
    }
  }

  update(state: State) {
    i += 0.5;

    state.strips.forEach((strip, index) => {
      strip.leds.fill(0)
      
      drawLine(strip, i + index * 10, 0);
      drawLine(strip, i + 20 + index * 10, Math.PI/2);
      drawLine(strip, i + 40 + index * 10, Math.PI);
    })

    return {
      ...state,
    }
  }
}

