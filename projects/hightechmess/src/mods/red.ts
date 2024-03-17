import { OctaCoreMod } from ".";
import { ClockPayload } from "../clock";
import { State } from "../state";

export class RedMod implements OctaCoreMod {
  init(state: State): State {
    return {
      ...state
    }
  }

  update(state: State, { frameIndex }: ClockPayload): State {
    console.log({ frameIndex });

    return {
      ...state
    }
  }
}