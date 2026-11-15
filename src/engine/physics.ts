import { Fruit, Bomb, SlicedHalf, Particle, JuiceSplatter } from '../types/game';

export const GRAVITY = 820; // pixels / segundo^2

export class PhysicsEngine {
  public static updateFruits(
    fruits: Fruit[],
    dt: number,
    canvasH: number,
    cutZoneTop: number,
    cutZoneBottom: number,
    slowMotionFactor: number = 1.0
  ): { activeFruits: Fruit[]; missedFruits: Fruit[] } {
    const effectiveDt = dt * slowMotionFactor;
    const activeFruits: Fruit[] = [];
    const missedFruits: Fruit[] = [];

    for (const fruit of fruits) {
      if (fruit.sliced) continue;

      // Movimento parabólico sob gravidade
      fruit.x += fruit.vx * effectiveDt;
      fruit.y += fruit.vy * effectiveDt + 0.5 * GRAVITY * effectiveDt * effectiveDt;
      fruit.vy += GRAVITY * effectiveDt;
      fruit.rotation += fruit.vRot * effectiveDt;

      // Verifica se entrou na zona útil de corte
      if (fruit.y >= cutZoneTop && fruit.y <= cutZoneBottom) {
        fruit.hasBeenInCutZone = true;
      }

      // Se saiu pela parte inferior da tela
      if (fruit.y > canvasH + fruit.radius * 2 && fruit.vy > 0) {
        // Só conta como perdida se atravessou uma região válida de corte e não foi cortada
        if (fruit.hasBeenInCutZone && !fruit.sliced) {
          fruit.missed = true;
          missedFruits.push(fruit);
        }
      } else {
        activeFruits.push(fruit);
      }
    }

    return { activeFruits, missedFruits };
  }

  public static updateSlicedHalves(
    halves: SlicedHalf[],
    dt: number,
    canvasH: number,
    slowMotionFactor: number = 1.0
  ): SlicedHalf[] {
    const effectiveDt = dt * slowMotionFactor;
    const activeHalves: SlicedHalf[] = [];

    for (const half of halves) {
      half.x += half.vx * effectiveDt;
      half.y += half.vy * effectiveDt + 0.5 * GRAVITY * effectiveDt * effectiveDt;
      half.vy += GRAVITY * effectiveDt;
      half.rotation += half.vRot * effectiveDt;

      // Mantém metade enquanto estiver visível
      if (half.y < canvasH + half.radius * 2) {
        activeHalves.push(half);
      }
    }

    return activeHalves;
  }

  public static updateBombs(
    bombs: Bomb[],
    dt: number,
    canvasH: number,
    slowMotionFactor: number = 1.0
  ): Bomb[] {
    const effectiveDt = dt * slowMotionFactor;
    const activeBombs: Bomb[] = [];

    for (const bomb of bombs) {
      if (bomb.exploded) continue;

      bomb.x += bomb.vx * effectiveDt;
      bomb.y += bomb.vy * effectiveDt + 0.5 * GRAVITY * effectiveDt * effectiveDt;
      bomb.vy += GRAVITY * effectiveDt;
      bomb.rotation += bomb.vRot * effectiveDt;

      if (bomb.y < canvasH + bomb.radius * 2) {
        activeBombs.push(bomb);
      }
    }

    return activeBombs;
  }

  public static updateParticles(particles: Particle[], dt: number): Particle[] {
    const active: Particle[] = [];

    for (const p of particles) {
      p.life -= dt;
      if (p.life > 0) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += (p.shape === 'smoke' ? -30 : GRAVITY * 0.4) * dt; // fumaça sobe, gotas caem
        p.alpha = Math.max(0, p.life / p.maxLife);
        active.push(p);
      }
    }

    return active;
  }

  public static updateJuiceSplatters(splatters: JuiceSplatter[], now: number): JuiceSplatter[] {
    // Manchas duram 4 segundos com fade out gradual
    return splatters.filter((s) => {
      const age = (now - s.createdAt) / 1000;
      if (age >= 4.0) return false;
      s.alpha = Math.max(0, 1.0 - age / 4.0);
      return true;
    });
  }

  /**
   * Divide uma fruta cortada em duas metades com impulso perpendicular à linha de corte.
   */
  public static splitFruit(
    fruit: Fruit,
    sliceAngle: number,
    cutSpeed: number
  ): [SlicedHalf, SlicedHalf] {
    // Vetor perpendicular ao corte
    const perpAngle = sliceAngle + Math.PI / 2;
    const impulse = Math.min(320, Math.max(160, cutSpeed * 0.35));

    const perpX = Math.cos(perpAngle);
    const perpY = Math.sin(perpAngle);

    const half1: SlicedHalf = {
      id: `${fruit.id}_half1`,
      type: fruit.type,
      x: fruit.x - perpX * (fruit.radius * 0.25),
      y: fruit.y - perpY * (fruit.radius * 0.25),
      vx: fruit.vx - perpX * impulse,
      vy: fruit.vy - Math.abs(perpY * impulse * 0.5) - 60,
      radius: fruit.radius,
      rotation: fruit.rotation,
      vRot: fruit.vRot - 3.5,
      sliceAngle,
      isLeftHalf: true,
      createdAt: performance.now(),
      color: fruit.color,
      internalColor: fruit.internalColor,
      seedColor: fruit.seedColor,
    };

    const half2: SlicedHalf = {
      id: `${fruit.id}_half2`,
      type: fruit.type,
      x: fruit.x + perpX * (fruit.radius * 0.25),
      y: fruit.y + perpY * (fruit.radius * 0.25),
      vx: fruit.vx + perpX * impulse,
      vy: fruit.vy - Math.abs(perpY * impulse * 0.5) - 60,
      radius: fruit.radius,
      rotation: fruit.rotation,
      vRot: fruit.vRot + 3.5,
      sliceAngle,
      isLeftHalf: false,
      createdAt: performance.now(),
      color: fruit.color,
      internalColor: fruit.internalColor,
      seedColor: fruit.seedColor,
    };

    return [half1, half2];
  }
}
