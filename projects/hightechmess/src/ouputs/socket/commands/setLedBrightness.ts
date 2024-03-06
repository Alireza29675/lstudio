import { createCommand } from "./utils/createCommand";
import { CommandID } from "../constants";

export const setLedBrightness = (amount: number): Buffer => {
  const brightness = Math.max(0, Math.min(255, amount));

  return createCommand(CommandID.SET_LED_BRIGTHNESS, [brightness]);
};
