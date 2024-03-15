import { Project } from "@lstudio/core";
import { initialState } from "./state";
import { clock } from "./clock";
import { mods } from "./mods";
import { OctaCoreOutput } from "./ouputs/socket";

export const project = new Project(initialState, mods)

new OctaCoreOutput({ project, clock, url: 'http://192.168.1.11:81', iOffset: 0 })
new OctaCoreOutput({ project, clock, url: 'http://192.168.68.105:81', iOffset: Math.PI * 1 / 4 })
new OctaCoreOutput({ project, clock, url: 'http://192.168.68.107:81', iOffset: Math.PI * 2 / 4 })
new OctaCoreOutput({ project, clock, url: 'http://192.168.68.108:81', iOffset: Math.PI * 3 / 4 })

project.setMod('sea')

clock.start()