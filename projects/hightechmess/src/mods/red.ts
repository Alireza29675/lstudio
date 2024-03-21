import { OctaCoreMod } from "./common/OctaCoreMod";
import { ClockPayload } from "../clock";
import { black, white } from "./palettes/colors";

export class RedMod extends OctaCoreMod {
  init() {
    this.state.palette = [
      black,
      white,
    ]
    this.state.strips.forEach(strip => {
      strip.brightness = 255;
      strip.leds.fill(black);
      strip.rotation = 0;
    });
  }

  update({ frameIndex }: ClockPayload) {
    console.log({ frameIndex });
  }
}