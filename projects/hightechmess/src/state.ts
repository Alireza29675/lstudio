import { Color } from "@lstudio/core"

export interface State {
  palette: Color[]
  strips: Array<{
    leds: number[]
    rotation: number
  }>
}

export const initialState: State = {
  palette: [
    new Color('#ff0000'),
    new Color('#00ff00'),
    new Color('#0000ff'),
    new Color('#ffff00'),
    new Color('#00ffff'),
    new Color('#ff00ff'),
  ],
  strips: [
    {
      leds: new Array(90).fill(0),
      rotation: 90
    },
    {
      leds: new Array(60).fill(1),
      rotation: 90
    },
    {
      leds: new Array(60).fill(2),
      rotation: 90
    },
    {
      leds: new Array(90).fill(3),
      rotation: 90
    },
  ]
}
