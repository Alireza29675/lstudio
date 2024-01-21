import { LEDStrip } from './LEDStrip'

export class LEDStripChain {
  constructor(
    readonly strips: LEDStrip[],
    readonly pin: number
  ) {}
}

export class LEDSetup {
  constructor(
    readonly chains: LEDStripChain[]
  ) {}
}

export class Project {
  constructor(
    readonly setup: LEDSetup
  ) {}
}