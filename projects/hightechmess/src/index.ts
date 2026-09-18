import { resolve } from "path";

import { clock } from "./clock";
import { loadEnvFile } from "./common/loadEnvFile";
import { createSyncedSocketOutput } from "./ouputs/socket/createSyncSocketOutput";
import { project } from "./project";

loadEnvFile(resolve(__dirname, "../.env"));

const configuredHosts = process.env.OCTACORE_HOSTS
  ?.split(",")
  .map((value) => value.trim())
  .filter(Boolean);

const hosts = configuredHosts?.length
  ? configuredHosts
  : [
      "octacore-1.local",
      "octacore-2.local",
      "octacore-3.local",
      "octacore-4.local",
    ];

const websocketPort = Number(process.env.OCTACORE_WEBSOCKET_PORT || "81");

if (!Number.isInteger(websocketPort) || websocketPort < 1 || websocketPort > 65535) {
  throw new Error("OCTACORE_WEBSOCKET_PORT must be a valid TCP port.");
}

const urls = hosts.map((host) => {
  if (/^wss?:\/\//i.test(host)) {
    return host;
  }

  return `ws://${host}:${websocketPort}`;
});

createSyncedSocketOutput(project, clock, urls);
