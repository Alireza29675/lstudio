import { Color, LEDStrip, LEDStripChain, Mod, Setup } from "@lstudio/core";

const white = new Color('#fff')
const black = new Color('#000')

class FlashMod extends Mod<{ frameIndex: number }> {
  update(setup: Setup, data: { frameIndex: number }): void {
    setup.components.forEach((component) => {
      if (component instanceof LEDStripChain) {
        component.strips.forEach((strip) => this.updateStrip(strip, data.frameIndex))
      }
    })
  }

  updateStrip(strip: LEDStrip, frameIndex: number): void {
    const isEven = frameIndex % 2 === 1
    strip.fill(isEven ? white : black)
  }
}

export const flashMod = new FlashMod