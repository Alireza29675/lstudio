// Easing functions
export function linear(t: number): number {
  return t
}

export function easeIn(t: number): number {
  return t * t
}

export function easeOut(t: number): number {
  return t * (2 - t)
}

export function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
}

export function spring(t: number): number {
  return 1 - Math.cos(t * Math.PI * 4) * Math.exp(-t * 6)
}

export function climax(t: number): number {
  return 1 - Math.pow(2, -10 * t)
}

// Random math utilities
export function randInt(min: number, max: number): number {
  min = Math.ceil(min)
  max = Math.floor(max)
  return Math.floor(Math.random() * (max - min + 1) + min)
}

export function rand(min: number, max: number): number {
  return Math.random() * (max - min) + min
}

export function randBool(trueWeight: number = 0.5): boolean {
  return Math.random() <= trueWeight
}

export function randItem<T>(arr: T[]): T {
  return arr[randInt(0, arr.length - 1)]
}

export function shuffle<T>(arr: T[]): T[] {
  return arr.slice().sort(() => Math.random() - 0.5)
}

// General Math utilities
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export function lerp(a: number, b: number, t: number, ease: (t: number) => number = linear): number {
  return a + (b - a) * ease(t)
}

export function degToRad(deg: number): number {
  return deg * Math.PI / 180
}

export function radToDeg(rad: number): number {
  return rad * 180 / Math.PI
}
