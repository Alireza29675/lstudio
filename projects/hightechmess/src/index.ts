import { getOutputAddresses } from "./config";

// Validate configuration before loading modules that open MIDI ports.
const addresses = getOutputAddresses();

async function start() {
  const { clock } = await import('./clock');
  const { project } = await import('./project');
  const { createSyncedSocketOutput } = await import('./ouputs/socket/createSyncSocketOutput');
  createSyncedSocketOutput(project, clock, addresses);
}

start().catch(error => {
  console.error(error);
  process.exit(1);
});
