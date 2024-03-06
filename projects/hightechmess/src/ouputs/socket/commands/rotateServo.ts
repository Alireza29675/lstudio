import { CommandID } from "../constants";
import { createCommand } from "./utils/createCommand";

export function rotateServo(angle: number): Buffer {
  angle = Math.max(0, Math.min(angle, 180));
  return createCommand(CommandID.ROTATE_SERVO, [angle]);
}