import { useEffect, useState } from "react"
import { ClockType, ProjectType } from "./types"
import { initialState } from "../../state"

export const useOuput = (project: ProjectType, clock: ClockType) => {
  const [state, setState] = useState(initialState)

  // subscribing to clock with unsubscribe effect
  useEffect(() => clock.subscribe((data) => {
    project.tick(data)
    setState(project.state)
  }), [clock, project])

  return state
}