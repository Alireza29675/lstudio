import { Color } from "@lstudio/core"
import { black, white } from "./mods/palettes/colors"
export interface State {
  palette: Color[]
  strips: Array<{
    leds: Color[]
    rotation: number
    brightness: number
  }>
}

export const initialState: State = {
  palette: [
    black,
    white
  ],
  strips: [
    {
      leds: new Array(60).fill(black),
      rotation: 30,
      brightness: 100
    },
    {
      leds: new Array(60).fill(black),
      rotation: 30,
      brightness: 100
    },
    {
      leds: new Array(60).fill(black),
      rotation: 30,
      brightness: 100
    },
    {
      leds: new Array(60).fill(black),
      rotation: 30,
      brightness: 100
    },
  ]
}
