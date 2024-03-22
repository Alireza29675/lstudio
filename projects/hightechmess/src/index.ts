import { clock } from "./clock";
import { OctaCoreOutput } from "./ouputs/socket";
import { project } from "./project";

new OctaCoreOutput({ project, clock, url: 'http://192.168.68.108:81', stripIndex: 0 })
new OctaCoreOutput({ project, clock, url: 'http://192.168.1.11:81', stripIndex: 1 })
new OctaCoreOutput({ project, clock, url: 'http://192.168.68.107:81', stripIndex: 2 })
new OctaCoreOutput({ project, clock, url: 'http://192.168.68.105:81', stripIndex: 3 })

clock.start()