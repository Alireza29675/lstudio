import { Color } from '../../utils/Color'

export enum LEDStripModel {
  WS2815 = 'WS2815'
}

export class LEDStrip {
  private _data: Uint8Array

  constructor(
    readonly count: number,
    readonly model: LEDStripModel = LEDStripModel.WS2815
  ) {
    this._data = new Uint8Array(count * 3).fill(0)
  }

  setIndex(index: number, color: Color) {
    if (index > this.count - 1) {
      throw new Error('Cannot set index more than LEDCount-1')
    }

    if (index < 0) {
      throw new Error('Cannot set index less than zero')
    }

    const startIndex = index * 3
    const { r, g, b } = color.getRGB()
    
    this._data[startIndex] = r
    this._data[startIndex + 1] = g
    this._data[startIndex + 2] = b
  }

  getIndex(index: number) {
    if (index > this.count - 1) {
      throw new Error('Cannot get index more than LEDCount-1')
    }

    if (index < 0) {
      throw new Error('Cannot get index less than zero')
    }

    const startIndex = index * 3

    return {
      r: this._data[startIndex],
      g: this._data[startIndex + 1],
      b: this._data[startIndex + 2],
    }
  }

  fill(color: Color) {
    for (let index = 0; index < this.count; index++) {
      this.setIndex(index, color)
    }
  }
}