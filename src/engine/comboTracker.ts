import { Fruit } from '../types/game';

export interface CompletedCombo {
  gestureId: number;
  count: number;
  multiplier: number;
  bonusPoints: number;
  message: string;
  centroid: { x: number; y: number };
}

export class ComboTracker {
  private currentGestureId: number = 0;
  private gestureStartTime: number = 0;
  private fruitsInCurrentGesture: Fruit[] = [];
  private isGestureActive: boolean = false;
  private lastCutTime: number = 0;

  public startNewGesture(now: number): void {
    this.currentGestureId++;
    this.gestureStartTime = now;
    this.lastCutTime = now;
    this.fruitsInCurrentGesture = [];
    this.isGestureActive = true;
  }

  public registerFruitCut(fruit: Fruit, now: number): void {
    if (!this.isGestureActive) {
      this.startNewGesture(now);
    }

    // Se passou da janela máxima de 600ms do combo contínuo, reinicia o gesto
    if (now - this.gestureStartTime > 600 || now - this.lastCutTime > 280) {
      this.startNewGesture(now);
    }

    this.lastCutTime = now;
    this.fruitsInCurrentGesture.push(fruit);
  }

  /**
   * Finaliza o gesto atual quando o movimento da lâmina pausa ou a janela de 600ms encerra.
   */
  public finalizeGesture(now: number): CompletedCombo | null {
    if (!this.isGestureActive || this.fruitsInCurrentGesture.length === 0) {
      this.isGestureActive = false;
      this.fruitsInCurrentGesture = [];
      return null;
    }

    const count = this.fruitsInCurrentGesture.length;
    const timeSinceLastCut = now - this.lastCutTime;
    const gestureDuration = now - this.gestureStartTime;

    // Se ainda estiver dentro do intervalo de tolerância para cortar mais frutas, não fecha ainda
    if (timeSinceLastCut < 220 && gestureDuration < 600) {
      return null;
    }

    // Gesto encerrou
    this.isGestureActive = false;
    const fruits = [...this.fruitsInCurrentGesture];
    this.fruitsInCurrentGesture = [];

    // Se cortou menos de 3 frutas, não forma combo especial
    if (count < 3) {
      return null;
    }

    let multiplier = 2;
    if (count === 4) {
      multiplier = 3;
    } else if (count >= 5) {
      multiplier = 4;
    }

    // Calcula os pontos base já somados
    const baseSum = fruits.reduce((acc, f) => acc + f.points, 0);
    // Bônus adicional para atingir o multiplicador
    const bonusPoints = baseSum * (multiplier - 1);

    // Centroide dos cortes para exibir o popup
    const avgX = fruits.reduce((acc, f) => acc + f.x, 0) / count;
    const avgY = fruits.reduce((acc, f) => acc + f.y, 0) / count;

    let message = `Combo ${count}! ${multiplier}x`;
    if (count >= 5) {
      message = `Corte Perfeito! ${multiplier}x`;
    }

    return {
      gestureId: this.currentGestureId,
      count,
      multiplier,
      bonusPoints,
      message,
      centroid: { x: avgX, y: avgY },
    };
  }

  public getCurrentMultiplier(): number {
    const count = this.fruitsInCurrentGesture.length;
    if (count >= 5) return 4;
    if (count === 4) return 3;
    if (count === 3) return 2;
    return 1;
  }

  public reset(): void {
    this.isGestureActive = false;
    this.fruitsInCurrentGesture = [];
    this.lastCutTime = 0;
    this.gestureStartTime = 0;
  }
}
