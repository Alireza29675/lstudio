import { Project } from "@lstudio/core";
import { initialState } from "./state";
import { stableMod } from "./mods/stable";
import { ConsoleOutput } from "./ouputs/web";
import { clock } from "./clock";

export const project = new Project(initialState, {
  stable: stableMod
})

export const output = new ConsoleOutput(project, clock)

clock.start()