import { LEDStripChain } from "./components/LEDStripChain";

type SupportedComponent = LEDStripChain // | other components here

export class Setup {
  constructor(
    readonly components: SupportedComponent[]
  ) {}
}
