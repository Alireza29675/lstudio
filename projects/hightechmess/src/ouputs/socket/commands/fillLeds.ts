import { createCommand } from "./utils/createCommand";
import { CommandID } from "../constants";

export const fillLeds = (colorPaletteIndex: number): Buffer => {
  if (colorPaletteIndex < 0 || colorPaletteIndex > 15) {
    throw new Error("Color palette index must be between 0 and 15.");
  }

  return createCommand(CommandID.FILL_LED, [colorPaletteIndex]);
};
