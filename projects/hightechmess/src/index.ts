import { clock } from './clock'
import { WebOutput } from './ouputs/web'
import { project } from './project'

export const output = new WebOutput(project, clock)

clock.start()