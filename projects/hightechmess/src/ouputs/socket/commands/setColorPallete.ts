import { RGB } from "@lstudio/core";
import { createCommand } from "./utils/createCommand";
import { CommandID } from "../constants";

export const setColorPalette = (colors: RGB[]): Buffer => {
  if (colors.length > 16) {
    throw new Error('Up to 16 colors are supported');
  }
  const filledColors = [...colors, ...Array(16 - colors.length).fill({r: 0, g: 0, b: 0})];
  const payload = filledColors.flatMap(color => [color.r, color.g, color.b]);

  return createCommand(CommandID.SET_COLOR_PALETTE, payload);
}
