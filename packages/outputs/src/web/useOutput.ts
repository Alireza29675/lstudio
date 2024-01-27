import { useEffect, useState } from "react"
import { Clock, Project } from '@lstudio/core'

export const useOutput = <C extends object, S extends object, P extends Project<C, S>>(
  { project, clock, initialState}:
  { project: P, clock: Clock<C>, initialState: S }
) => {
  const [state, setState] = useState(initialState)

  // subscribing to clock with unsubscribe effect
  useEffect(() => clock.subscribe((data) => {
    project.tick(data)
    setState(project.state)
  }), [clock, project])

  return state
}