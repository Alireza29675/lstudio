type RGB = {
  r: number;
  g: number;
  b: number;
};

export class Color {
  private r: number;
  private g: number;
  private b: number;

  constructor(color: `#${string}` | RGB) {
    if (typeof color === 'string' && color.length === 4) {
      const [, r, g, b] = color
      color = `#${r.repeat(2)}${g.repeat(2)}${b.repeat(2)}`
    }

    if (typeof color === 'string') {
      this.r = parseInt(color.slice(1, 3), 16);
      this.g = parseInt(color.slice(3, 5), 16);
      this.b = parseInt(color.slice(5, 7), 16);
    } else {
      this.r = color.r;
      this.g = color.g;
      this.b = color.b;
    }
  }

  getRGB(): RGB {
    return {
      r: this.r,
      g: this.g,
      b: this.b,
    };
  }

  brighten(amount: number): void {
    this.r = Math.min(255, this.r + amount);
    this.g = Math.min(255, this.g + amount);
    this.b = Math.min(255, this.b + amount);
  }

  darken(amount: number): void {
    this.r = Math.max(0, this.r - amount);
    this.g = Math.max(0, this.g - amount);
    this.b = Math.max(0, this.b - amount);
  }
}
