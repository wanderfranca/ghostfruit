class LowPassFilter {
  private y: number | null = null;
  private s: number | null = null;

  public filter(value: number, alpha: number): number {
    if (this.y === null) {
      this.s = value;
      this.y = value;
      return value;
    }
    this.s = alpha * value + (1.0 - alpha) * this.s!;
    this.y = this.s;
    return this.y;
  }

  public last(): number | null {
    return this.y;
  }

  public reset(): void {
    this.y = null;
    this.s = null;
  }
}

export class OneEuroFilter {
  private minCutoff: number;
  private beta: number;
  private dCutoff: number;
  private xFilter: LowPassFilter;
  private dxFilter: LowPassFilter;
  private lastTime: number | null = null;

  constructor(minCutoff: number = 1.0, beta: number = 0.007, dCutoff: number = 1.0) {
    this.minCutoff = minCutoff;
    this.beta = beta;
    this.dCutoff = dCutoff;
    this.xFilter = new LowPassFilter();
    this.dxFilter = new LowPassFilter();
  }

  private alpha(rate: number, cutoff: number): number {
    const tau = 1.0 / (2 * Math.PI * cutoff);
    const te = 1.0 / rate;
    return 1.0 / (1.0 + tau / te);
  }

  public filter(value: number, timestamp: number): number {
    if (this.lastTime === null) {
      this.lastTime = timestamp;
      return this.xFilter.filter(value, 1.0);
    }

    const dt = Math.max((timestamp - this.lastTime) / 1000.0, 1e-5);
    this.lastTime = timestamp;
    const rate = 1.0 / dt;

    const prevX = this.xFilter.last();
    const dx = prevX !== null ? (value - prevX) * rate : 0;
    const edx = this.dxFilter.filter(dx, this.alpha(rate, this.dCutoff));
    const cutoff = this.minCutoff + this.beta * Math.abs(edx);

    return this.xFilter.filter(value, this.alpha(rate, cutoff));
  }

  public reset(): void {
    this.xFilter.reset();
    this.dxFilter.reset();
    this.lastTime = null;
  }
}

export class Point2DFilter {
  private xFilter: OneEuroFilter;
  private yFilter: OneEuroFilter;
  private lastValidPoint: { x: number; y: number } | null = null;
  private maxJumpDistance: number = 3000; // tolerância generosa para alta velocidade e telas ultrawide

  constructor(minCutoff: number = 0.5, beta: number = 0.18) {
    this.xFilter = new OneEuroFilter(minCutoff, beta);
    this.yFilter = new OneEuroFilter(minCutoff, beta);
  }

  public filter(x: number, y: number, timestamp: number): { x: number; y: number } | null {
    if (this.lastValidPoint) {
      const dist = Math.hypot(x - this.lastValidPoint.x, y - this.lastValidPoint.y);

      // Deadband para micro-tremor de sensor quando o usuário para a mão (estabilidade total da mira)
      if (dist < 3.5) {
        // Absorve 85% do tremor residual de iluminação e ruído do sensor
        x = this.lastValidPoint.x * 0.85 + x * 0.15;
        y = this.lastValidPoint.y * 0.85 + y * 0.15;
      }

      // Rejeição apenas de teleporte espúrio impossível
      if (dist > this.maxJumpDistance) {
        return null;
      }
    }

    const smoothX = this.xFilter.filter(x, timestamp);
    const smoothY = this.yFilter.filter(y, timestamp);

    this.lastValidPoint = { x: smoothX, y: smoothY };
    return this.lastValidPoint;
  }

  public setMaxJump(maxJump: number): void {
    this.maxJumpDistance = maxJump;
  }

  public reset(): void {
    this.xFilter.reset();
    this.yFilter.reset();
    this.lastValidPoint = null;
  }
}
