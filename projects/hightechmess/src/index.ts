import { clock } from "./clock";
import { createSyncedSocketOutput } from "./ouputs/socket/createSyncSocketOutput";
import { project } from "./project";

createSyncedSocketOutput(project, clock, [
  'http://192.168.1.136:81',
  'http://192.168.1.11:81',
  'http://192.168.1.46:81',
  'http://192.168.1.223:81',
])