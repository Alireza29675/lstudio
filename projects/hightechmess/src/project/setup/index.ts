import { LEDStrip, LEDStripChain, LEDStripModel, Setup } from '@lstudio/core'

export const tubes = [
  new LEDStrip(20, LEDStripModel.WS2815),
  new LEDStrip(10, LEDStripModel.WS2815),
  new LEDStrip(10, LEDStripModel.WS2815),
  new LEDStrip(20, LEDStripModel.WS2815),
]

const TUBE_CHAIN_PIN = 5

export const tubeChain = new LEDStripChain(tubes, TUBE_CHAIN_PIN)

export const setup = new Setup([tubeChain])
