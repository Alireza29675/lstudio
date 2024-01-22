import { LEDStrip } from './LEDStrip'

export class LEDStripChain {
  constructor(
    readonly strips: LEDStrip[],
    readonly pin: number
  ) {}
}
