import { Color, Mod } from "@lstudio/core"
import { ClockPayloadType } from "../clock";
import { State } from "../state";

const black = new Color('#000000')
const primary = new Color('#00ffef')
const primaryDarker = primary.darkenClone(0.5);

const createParticle = (strip: State['strips'][number], weight: number) => {
  let location = 0;
  let speed = 0;

  return {
    next(frameIndex: number) {
      strip.rotation = Math.floor(Math.sin(frameIndex / 100) * 50);

      const acceration = -Math.sin(strip.rotation / 360 * Math.PI) * weight;
      speed += acceration
      location = Math.round(location + speed)
      
      location = Math.max(0, location)
      location = Math.min(strip.leds.length - 1, location)

      const isAtTheEnd = location === strip.leds.length - 1 && speed > 0 || location === 0 && speed < 0

      if (isAtTheEnd) {
        speed = 0
      }

      const previousLocation = Math.min(Math.max(location + Math.sign(speed), 0), strip.leds.length - 1)

      strip.leds[previousLocation] = primaryDarker
      strip.leds[location] = primary
    }
  }
}

export class SandclockMod implements Mod<ClockPayloadType, State> {
  particles: ReturnType<typeof createParticle>[] = []

  init(state: State): State {
    const strip = state.strips[1]

    this.particles = Array(40).fill(0).map((_, i) => createParticle(strip, (i + 1) * 0.3))

    return {
      ...state
    }
  }

  update(state: State, clock: ClockPayloadType): State {
    const strip = state.strips[1]
    strip.leds.fill(black)

    this.particles.forEach(p => p.next(clock.frameIndex))

    return {
      ...state
    }
  }
}