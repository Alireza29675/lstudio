import { Color, Mod } from "@lstudio/core"
import { ClockPayloadType } from "../clock";
import { State } from "../state";

const black = new Color('#222222')
const white = new Color('#5599ff')

export class SnakeMod implements Mod<ClockPayloadType, State> {
  private index = 0
  private currentColor = white;

  init(state: State): State {
    state.stripOne.fill(black)
    state.stripTwo.fill(black)
    state.stripThree.fill(black)
    state.stripFour.fill(black)

    return {
      ...state
    }
  }

  update(state: State) {
    this.index++

    if (this.index % 12 === 0) {
      this.currentColor = this.currentColor === white ? black : white;
    }

    state.stripOne[this.index % state.stripOne.length] = this.currentColor;
    state.stripTwo[this.index % state.stripTwo.length] = this.currentColor;
    state.stripThree[this.index % state.stripThree.length] = this.currentColor;
    state.stripFour[this.index % state.stripFour.length] = this.currentColor;

    return {
      ...state,
    }
  }
}

