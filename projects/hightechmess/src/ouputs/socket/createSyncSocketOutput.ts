import { OctaCoreOutput } from ".";
import type { MidiConnectedClock } from "../../clock";
import type { OctaCoreProject } from "../../project";

export const createSyncedSocketOutput = (project: OctaCoreProject, clock: MidiConnectedClock, addresses: string[]) => {
  const outputs = addresses.map((url, stripIndex) =>
    new OctaCoreOutput({ project, clock, url, stripIndex, subscribeToClock: false })
  );

  // Advance the shared animation once, then render the same frame on each board.
  const unsubscribe = clock.subscribe(data => {
    project.tick(data);
    outputs.forEach(output => output.render(project.state));
  });

  clock.start();
  let stopped = false;
  return () => {
    if (stopped) return;
    stopped = true;
    clock.stop();
    unsubscribe();
    outputs.forEach(output => output.close());
  };
};
