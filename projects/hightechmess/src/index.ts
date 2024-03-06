import { Project } from "@lstudio/core";
import { initialState } from "./state";
import { clock } from "./clock";
import { mods } from "./mods";

export const project = new Project(initialState, mods)

let socketOuput: object | null;

export const getSocketOuput = async () => {
  if (socketOuput) return socketOuput;
  const { SocketOutput } = await import("./ouputs/socket")
  socketOuput = new SocketOutput({ project, clock, url: 'http://192.168.1.11:81' })
  return socketOuput
}

export const getWebOutput = async () => {
  const { createWebOuput } = await import('./ouputs/web');
  return createWebOuput({ project, clock })
}

project.setMod('sea')

clock.start()