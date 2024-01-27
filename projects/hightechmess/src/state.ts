import { Color } from "@lstudio/core"

export interface State {
  stripOne: Color[]
  stripTwo: Color[]
  stripThree: Color[]
  stripFour: Color[]
}

export const initialState: State = {
  stripOne: new Array(20).fill(new Color('#000000')),
  stripTwo: new Array(10).fill(new Color('#000000')),
  stripThree: new Array(10).fill(new Color('#000000')),
  stripFour: new Array(20).fill(new Color('#000000')),
}
