import { Color, Mod } from "@lstudio/core"
import { ClockPayloadType } from "../clock";
import { State } from "../state";

const black = new Color('#222222')
const white = new Color('#eeeeee')

const ledMap = (shouldShine: boolean) => () => {
  // Generate some small noise
  if (Math.random() < 0.1) return black;
  return shouldShine ? white : black
}

export class lightningMod implements Mod<ClockPayloadType, State> {
  update(state: State) {
    const { stripOne, stripTwo, stripThree, stripFour } = state

    const stripToShine = Math.floor(Math.random() * 4);

    return {
      ...state,
      stripOne: stripOne.map(ledMap(stripToShine === 0)),
      stripTwo: stripTwo.map(ledMap(stripToShine === 1)),
      stripThree: stripThree.map(ledMap(stripToShine === 2)),
      stripFour: stripFour.map(ledMap(stripToShine === 3)),
    }
  }
}

