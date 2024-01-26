import { Project } from "@lstudio/core";
import { initialState } from "./state";
import { ConsoleOutput } from "./ouputs/web";
import { clock } from "./clock";
import { mods } from "./mods";

export const project = new Project(initialState, mods)

export const output = new ConsoleOutput(project, clock)

project.setMod('train')

clock.start()