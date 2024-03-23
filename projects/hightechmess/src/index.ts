import { clock } from "./clock";
import { createSyncedSocketOutput } from "./ouputs/socket/createSyncSocketOutput";
import { project } from "./project";

createSyncedSocketOutput(project, clock, [
  'http://192.168.68.102:81',
  'http://192.168.68.105:81',
  'http://192.168.68.101:81',
  'http://192.168.68.100:81',
])