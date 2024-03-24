import { clock } from "./clock";
import { createSyncedSocketOutput } from "./ouputs/socket/createSyncSocketOutput";
import { project } from "./project";

createSyncedSocketOutput(project, clock, [
  'http://192.168.68.106:81',
  'http://192.168.68.104:81',
  'http://192.168.68.103:81',
  'http://192.168.68.105:81',
])