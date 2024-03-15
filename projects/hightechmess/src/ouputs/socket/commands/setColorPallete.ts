import { Color } from "@lstudio/core";
import { createCommand } from "./utils/createCommand";
import { CommandID } from "../constants";

const black = new Color('#000000');

export const setColorPalette = (colors: Color[]): Buffer => {
  if (colors.length > 16) {
    throw new Error('Up to 16 colors are supported');
  }
  const filledColors = [...colors, ...Array(16 - colors.length).fill(black) as Color[]];
  const payload = filledColors.flatMap(color => {
    const { r, g, b} = color.getRGB();
    return [r, g, b]
  });

  return createCommand(CommandID.SET_COLOR_PALETTE, payload);
}
