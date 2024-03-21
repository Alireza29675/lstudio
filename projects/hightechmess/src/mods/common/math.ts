export function randInt(min: number, max: number): number {
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

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

export function degToRad(deg: number): number {
  return deg * Math.PI / 180
}

export function radToDeg(rad: number): number {
  return rad * 180 / Math.PI
}
