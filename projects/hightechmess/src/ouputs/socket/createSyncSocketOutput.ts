import { OctaCoreOutput } from ".";
import { MidiConnectedClock } from "../../clock";
import { OctaCoreProject } from "../../project";

export const createSyncedSocketOutput = async (project: OctaCoreProject, clock: MidiConnectedClock, addresses: string[]) => {
  const ready = addresses.map((address, i) => {
    const output = new OctaCoreOutput({ project, clock, url: address, stripIndex: i });
    return output.waitToGetReady;
  });

  await Promise.all(ready);

  clock.start();
}