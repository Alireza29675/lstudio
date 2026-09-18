import { OctaCoreOutput } from ".";
import { MidiConnectedClock } from "../../clock";
import { OctaCoreProject } from "../../project";

export const createSyncedSocketOutput = (
  project: OctaCoreProject,
  clock: MidiConnectedClock,
  addresses: string[]
) => {
  // Advance the shared project exactly once per frame.
  clock.subscribe((clockData) => {
    project.tick(clockData);
  });

  addresses.forEach((address, stripIndex) => {
    new OctaCoreOutput({
      project,
      clock,
      url: address,
      stripIndex,
    });
  });

  // Outputs connect independently. A missing controller must not freeze the
  // clock or the other controllers.
  clock.start();
};
