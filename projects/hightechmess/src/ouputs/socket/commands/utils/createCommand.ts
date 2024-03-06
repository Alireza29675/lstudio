import { CommandID } from "../../constants";

export const createCommand = (commandId: CommandID, payload: number[]): Buffer => {
  const commandByte = commandId & 0xFF;
  const payloadBytes = payload.map((byte) => byte & 0xFF);

  return Buffer.from([commandByte, ...payloadBytes]);
}