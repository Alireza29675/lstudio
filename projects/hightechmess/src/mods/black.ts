import { OctaCoreMod } from "./common/OctaCoreMod";
import { ClockPayload } from "../clock";
import { black, red, white } from "./palettes/colors";

export class BlackMod extends OctaCoreMod {
  init() {
    this.state.palette = [
      black,
      white,
      red,
    ]
    this.state.strips.forEach(strip => {
      strip.brightness = 10;
      strip.leds.fill(red);
      strip.rotation = 0;
    });
  }

  update({ frameIndex }: ClockPayload) {
    console.log({ frameIndex });
  }
}