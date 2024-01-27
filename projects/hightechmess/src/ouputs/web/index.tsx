import { ClockType, ProjectType } from "./types"
import { useOuput } from "./useOutput"

interface IProps {
  project: ProjectType
  clock: ClockType
} 

export const WebOutput = ({ project, clock }: IProps) => {
  const state = useOuput(project, clock)

  return <div>
    {JSON.stringify(state)}
  </div>
}

export const createWebOuput = (props: IProps) => <WebOutput {...props} />