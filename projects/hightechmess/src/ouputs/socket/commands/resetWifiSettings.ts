import { CommandID } from "../constants";
import { createCommand } from "./utils/createCommand";

export function resetWifiSettings(): Buffer {
  return createCommand(CommandID.RESET_WIFI_SETTINGS, [1]);
}