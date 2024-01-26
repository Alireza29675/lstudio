import { Ouput } from '@lstudio/core'
import { ClockPayloadType } from '../../clock'
import { State } from '../../state'

export class ConsoleOutput extends Ouput<ClockPayloadType, State> {
  render(state: State) {
    console.log(state.leds)
  }
}
