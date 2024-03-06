import { createCommand } from "./utils/createCommand";
import { CommandID } from "../constants";

export const setLedColors = (colorPaletteIndexes: number[]): Buffer => {
  colorPaletteIndexes.forEach(index => {
    if (index < 0 || index > 15) {
      throw new Error("Each color palette index must be between 0 and 15.");
    }
  });

  const payload = colorPaletteIndexes.reduce((acc, index, i) => {
    const bytePosition = Math.floor(i / 2);
    const isEvenIndex = i % 2 === 0;
    const shiftedIndex = isEvenIndex ? index : index << 4;

    acc[bytePosition] = (acc[bytePosition] || 0) | shiftedIndex;
    return acc;
  }, [] as number[]);

  return createCommand(CommandID.SET_LED_COLORS, payload);
};
