import { Project } from "@lstudio/core";
import { initialState } from "./state";
import { createWebOuput } from "./ouputs/web";
import { clock } from "./clock";
import { mods } from "./mods";
import './ouputs/socket'

export const project = new Project(initialState, mods)

export const output = createWebOuput({ project, clock })

project.setMod('sea')

clock.start()