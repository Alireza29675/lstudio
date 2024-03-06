import { Project } from "@lstudio/core";
import { initialState } from "./state";
import { clock } from "./clock";
import { mods } from "./mods";
import { OctaCoreOutput } from "./ouputs/socket";

export const project = new Project(initialState, mods)

new OctaCoreOutput({ project, clock, url: 'http://192.168.1.11:81' })

project.setMod('sea')

clock.start()