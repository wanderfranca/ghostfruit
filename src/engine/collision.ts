import { Fruit, Bomb } from '../types/game';

export interface CollisionHit {
  target: Fruit | Bomb;
  isBomb: boolean;
  sliceAngle: number;
  cutSpeed: number;
  contactPoint: { x: number; y: number };
}

export class CollisionDetector {
  /**
   * Distância perpendicular mínima de um ponto a um segmento de reta P1 -> P2.
   */
  public static pointToSegmentDistance(
    px: number,
    py: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number
  ): { distance: number; closestX: number; closestY: number } {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;

    if (lenSq === 0) {
      const dist = Math.hypot(px - x1, py - y1);
      return { distance: dist, closestX: x1, closestY: y1 };
    }

    // Projeção escalar normalizada sobre o segmento [0, 1]
    const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lenSq));
    const closestX = x1 + t * dx;
    const closestY = y1 + t * dy;
    const distance = Math.hypot(px - closestX, py - closestY);

    return { distance, closestX, closestY };
  }

  /**
   * Verifica colisão contínua (CCD) entre o corte da lâmina e os objetos em tela.
   */
  public static checkBladeSegment(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    dt: number,
    minCutSpeed: number,
    fruits: Fruit[],
    bombs: Bomb[],
    bladeRadius: number = 24
  ): CollisionHit[] {
    const hits: CollisionHit[] = [];

    // Distância do movimento
    const moveDist = Math.hypot(x2 - x1, y2 - y1);
    const speed = dt > 0 ? (moveDist / dt) : 100; // px/segundo

    // Encostou na fruta, corta! Só bloqueia se houver minCutSpeed explícito configurado
    if (minCutSpeed > 0 && speed < minCutSpeed) {
      return hits;
    }

    const sliceAngle = Math.atan2(y2 - y1, x2 - x1);

    // 1. Testa colisão com Frutas (apenas não cortadas)
    for (const fruit of fruits) {
      if (fruit.sliced) continue;

      const { distance, closestX, closestY } = CollisionDetector.pointToSegmentDistance(
        fruit.x,
        fruit.y,
        x1,
        y1,
        x2,
        y2
      );

      if (distance <= fruit.radius + bladeRadius) {
        hits.push({
          target: fruit,
          isBomb: false,
          sliceAngle,
          cutSpeed: speed,
          contactPoint: { x: closestX, y: closestY },
        });
      }
    }

    // 2. Testa colisão com Bombas (apenas não explodidas)
    for (const bomb of bombs) {
      if (bomb.exploded) continue;

      const { distance, closestX, closestY } = CollisionDetector.pointToSegmentDistance(
        bomb.x,
        bomb.y,
        x1,
        y1,
        x2,
        y2
      );

      if (distance <= bomb.radius + bladeRadius) {
        hits.push({
          target: bomb,
          isBomb: true,
          sliceAngle,
          cutSpeed: speed,
          contactPoint: { x: closestX, y: closestY },
        });
      }
    }

    return hits;
  }
}
