import { Color } from "@lstudio/core";
import { OctaCoreMod } from "../common/OctaCoreMod";
import { StripAdapter } from "../common/StripAdapter";
import { black, blue, crimson, mint, white } from "../palettes/colors";

export abstract class CrossMod extends OctaCoreMod {
  public crosses: StripAdapter[][] = []
  public brightnesses = [
    [0, 0],
    [0, 0],
  ]

  init() {
    this.setPalette([
      black,
      white,
      blue,
      crimson,
      mint
    ])

    this.setBrightness(0);

    this.crosses = [
      [this.get(0), this.get(1)],
      [this.get(2), this.get(3)],
    ]
  }

  setAllCrossesBrightness(brightness: number) {
    this.brightnesses = this.brightnesses.map(row => row.map(() => brightness))
  }

  hit(row: number, col: number, brightness: number, colorFn?: (i: number) => Color) {
    this.brightnesses[row][col] = brightness
    if (colorFn) this.crosses[row][col].fill(colorFn)
  }

  setCrossRotation(rotation: number) {
    this.crosses[0][0].setRotation(140 + rotation)
    this.crosses[0][1].setRotation(40 + rotation)

    this.crosses[1][0].setRotation(140 + rotation)
    this.crosses[1][1].setRotation(40 + rotation)
  }

  updateCrosses() {
    this.crosses.forEach((row, rowIndex) => {
      row.forEach((strip, colIndex) => {
        const brightness = this.brightnesses[rowIndex][colIndex]
        strip.setBrightness(brightness)
      })
    })

    this.brightnesses = this.brightnesses.map(row => row.map(brightness => {
      if (brightness > 0) {
        return Math.max(0, brightness - 10)
      }

      return 0
    }))
  }
}