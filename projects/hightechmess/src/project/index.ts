import { Project } from "@lstudio/core";
import { setup } from "./setup";
import { flashMod } from "./mods/flash";

export const project = new Project(setup, {
  flash: flashMod
})
