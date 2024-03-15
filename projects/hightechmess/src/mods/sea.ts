import { Color, Mod } from "@lstudio/core"
import { ClockPayloadType } from "../clock";
import { State } from "../state";

let i = 0;

const drawLine = (strip: State['strips'][number], start: number, offset: number) => {
  const len = Math.floor(Math.sin((i / 10 - offset)) * 6) + 7
  for (let j = start; j < start+len; j++) {
    strip.leds[j % 60] = 1;
  }
}

export class SeaMod implements Mod<ClockPayloadType, State> {
  init(state: State): State {
    state.palette = [
      new Color("#000"),
      new Color("#fff"),
    ]

    return {
      ...state
    }
  }
  update(state: State) {
    i++;
    
    state.strips.forEach(strip => {
      strip.leds.fill(0)
      
      drawLine(strip, i, 0);
      drawLine(strip, i + 20, Math.PI/2);
      drawLine(strip, i + 40, Math.PI);
    })

    return {
      ...state,
    }
  }
}

