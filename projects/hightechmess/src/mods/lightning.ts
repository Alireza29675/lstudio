import { Color, Mod } from "@lstudio/core"
import { ClockPayloadType } from "../clock";
import { State } from "../state";

const black = new Color('#222222')
const white = new Color('#eeeeee')

export class lightningMod implements Mod<ClockPayloadType, State> {
  update(state: State, { frameIndex }: ClockPayloadType) {
    const { stripOne, stripTwo, stripThree, stripFour } = state

    if (frameIndex % 3 !== 0) {
      return { ...state }
    }

    const stripToShine = Math.floor(Math.random() * 4);

    return {
      ...state,
      stripOne: stripOne.fill(stripToShine === 0 ? white : black),
      stripTwo: stripTwo.fill(stripToShine === 1 ? white : black),
      stripThree: stripThree.fill(stripToShine === 2 ? white : black),
      stripFour: stripFour.fill(stripToShine === 3 ? white : black),
    }
  }
}

