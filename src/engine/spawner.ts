import { Fruit, Bomb, FruitType, GameMode, CalibrationProfile } from '../types/game';
import { GRAVITY } from './physics';

const FRUIT_PALETTES: Record<
  FruitType,
  { name: string; color: string; glowColor: string; internalColor: string; seedColor: string; baseRadius: number }
> = {
  watermelon: {
    name: 'Melancia Shinobi',
    color: '#15803d', // verde folha da vila
    glowColor: '#22c55e',
    internalColor: '#dc2626', // rubi uchiha
    seedColor: '#0a0d16',
    baseRadius: 46,
  },
  apple: {
    name: 'Maçã do Fogo',
    color: '#b91c1c', // vermelho uchiha
    glowColor: '#ef4444',
    internalColor: '#fef08a', // polpa dourada pergaminho
    seedColor: '#451a03',
    baseRadius: 36,
  },
  orange: {
    name: 'Laranja Chakra',
    color: '#ea580c', // chama de chakra
    glowColor: '#f97316',
    internalColor: '#fdba74',
    seedColor: '#7c2d12',
    baseRadius: 38,
  },
  banana: {
    name: 'Banana Relâmpago',
    color: '#eab308', // amarelo dourado
    glowColor: '#facc15',
    internalColor: '#fef9c3',
    seedColor: '#713f12',
    baseRadius: 34,
  },
  dragonfruit: {
    name: 'Pitaya da Folha',
    color: '#c2410c', // terracota ninja
    glowColor: '#fb923c',
    internalColor: '#fff7ed',
    seedColor: '#0f172a',
    baseRadius: 42,
  },
  starfruit: {
    name: 'Shuriken Estelar',
    color: '#84cc16', // verde limão da folha
    glowColor: '#a3e635',
    internalColor: '#fef08a',
    seedColor: '#365314',
    baseRadius: 39,
  },
};

const FRUIT_TYPES: FruitType[] = ['watermelon', 'apple', 'orange', 'banana', 'dragonfruit', 'starfruit'];

export class Spawner {
  private lastSpawnTime: number = 0;
  private idCounter: number = 0;

  /**
   * Determina o nível atual com base nos segundos jogados (0 a 90).
   */
  public static getLevel(elapsedSeconds: number): number {
    if (elapsedSeconds < 18) return 1;
    if (elapsedSeconds < 36) return 2;
    if (elapsedSeconds < 54) return 3;
    if (elapsedSeconds < 72) return 4;
    return 5;
  }

  /**
   * Retorna os parâmetros de onda para o nível e modo atual.
   */
  public static getLevelParameters(level: number, mode: GameMode) {
    // Parâmetros base do modo Normal
    const baseParams = [
      { speed: 1.0, interval: 1.4, maxObjects: 3, bombProb: 0.05 },
      { speed: 1.1, interval: 1.25, maxObjects: 4, bombProb: 0.08 },
      { speed: 1.2, interval: 1.1, maxObjects: 5, bombProb: 0.1 },
      { speed: 1.3, interval: 1.0, maxObjects: 6, bombProb: 0.13 },
      { speed: 1.4, interval: 0.9, maxObjects: 7, bombProb: 0.15 },
    ][level - 1] || { speed: 1.0, interval: 1.4, maxObjects: 3, bombProb: 0.05 };

    if (mode === 'iniciante') {
      return {
        speed: baseParams.speed * 0.85,
        interval: baseParams.interval * 1.25,
        maxObjects: Math.max(2, baseParams.maxObjects - 1),
        bombProb: baseParams.bombProb * 0.4,
        sizeScale: 1.2,
      };
    } else if (mode === 'desafio') {
      return {
        speed: baseParams.speed * 1.15,
        interval: baseParams.interval * 0.88,
        maxObjects: Math.min(8, baseParams.maxObjects + 1),
        bombProb: baseParams.bombProb * 1.2,
        sizeScale: 0.95,
      };
    }

    return {
      ...baseParams,
      sizeScale: 1.0,
    };
  }

  public shouldSpawnWave(
    now: number,
    elapsedSeconds: number,
    level: number,
    mode: GameMode,
    dynamicAssistanceActive: boolean
  ): boolean {
    // Regra obrigatória: interromper novos lançamentos nos últimos 3.5 segundos da partida
    if (elapsedSeconds >= 86.5) {
      return false;
    }

    let { interval } = Spawner.getLevelParameters(level, mode);

    // Assistência dinâmica aumenta o intervalo para aliviar pressão
    if (dynamicAssistanceActive) {
      interval *= 1.4;
    }

    return (now - this.lastSpawnTime) / 1000 >= interval;
  }

  public spawnWave(
    now: number,
    canvasW: number,
    canvasH: number,
    elapsedSeconds: number,
    level: number,
    mode: GameMode,
    profile: CalibrationProfile | null,
    currentBombCount: number,
    dynamicAssistanceActive: boolean
  ): { fruits: Fruit[]; bombs: Bomb[] } {
    this.lastSpawnTime = now;

    let { speed, maxObjects, bombProb, sizeScale } = Spawner.getLevelParameters(level, mode);

    if (dynamicAssistanceActive) {
      maxObjects = Math.max(2, maxObjects - 1);
      bombProb = 0; // sem bombas na onda de assistência
    }

    // Área confortável: ápice da trajetória bem alto na tela (entre 12% e 35% do topo do jogo)
    // para voar alto, dar amplo tempo de reação e ficar na zona perfeita de corte ninja
    const safeMinX = canvasW * 0.12;
    const safeMaxX = canvasW * 0.88;
    const targetMinY = canvasH * 0.12;
    const targetMaxY = canvasH * 0.35;

    // Quantidade de objetos nesta onda (1 a maxObjects)
    const count = Math.min(
      maxObjects,
      Math.max(1, Math.floor(Math.random() * (maxObjects - 1)) + (level >= 3 ? 2 : 1))
    );

    const newFruits: Fruit[] = [];
    const newBombs: Bomb[] = [];

    // Limites de bombas por modo
    const maxAllowedBombs = mode === 'iniciante' ? 1 : 2;
    // Primeiros 5 segundos da partida livres de bombas
    const allowBombs = elapsedSeconds > 5.0 && currentBombCount < maxAllowedBombs;

    // Lista de posições de ápice (alvos) para garantir que bombas e frutas não se sobreponham
    const apexPositions: Array<{ x: number; y: number; r: number; isBomb: boolean }> = [];

    for (let i = 0; i < count; i++) {
      this.idCounter++;
      const id = `obj_${this.idCounter}_${Date.now()}`;

      // Decide se é bomba ou fruta
      const isBomb =
        allowBombs &&
        newBombs.length + currentBombCount < maxAllowedBombs &&
        Math.random() < bombProb;

      // Sorteia posição X e Y do ápice da trajetória dentro da zona segura
      let targetX = safeMinX + Math.random() * (safeMaxX - safeMinX);
      let targetY = targetMinY + Math.random() * (targetMaxY - targetMinY);

      const objectRadius = isBomb ? 34 * sizeScale : 38 * sizeScale;

      // Regra de segurança: evitar sobreposição entre bombas e frutas
      let overlap = false;
      const minSafeDistance = objectRadius * 2 + 75; // folga generosa para lâmina

      for (const existing of apexPositions) {
        const d = Math.hypot(targetX - existing.x, targetY - existing.y);
        // Se houver bomba e fruta muito próximas, separa
        if ((isBomb || existing.isBomb) && d < minSafeDistance) {
          overlap = true;
          // Desloca targetX para longe da bomba
          targetX = existing.x > canvasW / 2 ? existing.x - minSafeDistance : existing.x + minSafeDistance;
          targetX = Math.max(safeMinX, Math.min(safeMaxX, targetX));
          break;
        }
      }

      apexPositions.push({ x: targetX, y: targetY, r: objectRadius, isBomb });

      // Cálculo balístico:
      // O objeto é lançado de baixo (y0 = canvasH + 40)
      // Queremos que atinja o ápice em targetX, targetY no tempo tApex
      // No ápice: vy = 0 => vy0 = -sqrt(2 * g * (canvasH + 40 - targetY))
      const spawnY = canvasH + objectRadius + 30;
      const heightToRise = spawnY - targetY;
      // v0 = -sqrt(2 * g * h) garante que o ápice alcance targetY no terço superior da tela
      const vy0 = -Math.sqrt(2 * GRAVITY * heightToRise);
      const timeToApex = Math.abs(vy0) / GRAVITY;

      // Ponto de partida no X (levemente inclinado em direção ao centro)
      const spawnX = targetX + (Math.random() - 0.5) * 120;
      const vx0 = (targetX - spawnX) / timeToApex;

      const rotSpeed = (Math.random() - 0.5) * 4.5;

      if (isBomb) {
        newBombs.push({
          id,
          x: spawnX,
          y: spawnY,
          vx: vx0,
          vy: vy0,
          radius: objectRadius,
          rotation: 0,
          vRot: rotSpeed,
          exploded: false,
          pointsPenalty: 50,
        });
      } else {
        const type = FRUIT_TYPES[Math.floor(Math.random() * FRUIT_TYPES.length)];
        const palette = FRUIT_PALETTES[type];
        const isSpecial = Math.random() < 0.12; // 12% fruta especial (+25 pts)

        newFruits.push({
          id,
          type,
          isSpecial,
          x: spawnX,
          y: spawnY,
          vx: vx0,
          vy: vy0,
          radius: (palette.baseRadius + (isSpecial ? 6 : 0)) * sizeScale,
          rotation: Math.random() * Math.PI * 2,
          vRot: rotSpeed,
          sliced: false,
          sliceAngle: 0,
          missed: false,
          points: isSpecial ? 25 : 10,
          color: isSpecial ? '#f59e0b' : palette.color,
          glowColor: isSpecial ? '#fde047' : palette.glowColor,
          internalColor: isSpecial ? '#fef9c3' : palette.internalColor,
          seedColor: palette.seedColor,
          hasBeenInCutZone: false,
        });
      }
    }

    return { fruits: newFruits, bombs: newBombs };
  }
}
