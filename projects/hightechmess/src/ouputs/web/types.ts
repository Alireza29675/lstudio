import { Clock, Project } from '@lstudio/core'
import { ClockPayloadType } from '../../clock'
import { State } from '../../state'

export type ProjectType = Project<ClockPayloadType, State, string>
export type ClockType = Clock<ClockPayloadType>
