import { Color } from "@lstudio/core"

export interface State {
  strips: Array<{
    leds: Color[]
    rotation: number
  }>
}

export const initialState: State = {
  strips: [
    {
      leds: new Array(90).fill(new Color('#000000')),
      rotation: 90
    },
    {
      leds: new Array(60).fill(new Color('#000000')),
      rotation: 90
    },
    {
      leds: new Array(60).fill(new Color('#000000')),
      rotation: 90
    },
    {
      leds: new Array(90).fill(new Color('#000000')),
      rotation: 90
    },
  ]
}
