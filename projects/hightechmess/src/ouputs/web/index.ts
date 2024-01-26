import { Ouput } from '@lstudio/core'
import { ClockPayloadType } from '../../clock'
import { State } from '../../state'

export class ConsoleOutput extends Ouput<ClockPayloadType, State> {
  render(state): void {
    console.log(state.leds)
  }
}
