import { Project } from "@lstudio/core";
import { initialState } from "./state";
import { clock } from "./clock";
import { mods } from "./mods";
import { OctaCoreOutput } from "./ouputs/socket";
import './common/midi'

export const project = new Project(initialState, mods)

new OctaCoreOutput({ project, clock, url: 'http://192.168.68.108:81', stripIndex: 0 })
new OctaCoreOutput({ project, clock, url: 'http://192.168.1.11:81', stripIndex: 1 })
new OctaCoreOutput({ project, clock, url: 'http://192.168.68.107:81', stripIndex: 2 })
new OctaCoreOutput({ project, clock, url: 'http://192.168.68.105:81', stripIndex: 3 })

clock.start()