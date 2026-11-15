import {
  Fruit,
  Bomb,
  SlicedHalf,
  Particle,
  JuiceSplatter,
  FloatingText,
  BladePoint,
  GameMode,
  GameState,
  CalibrationProfile,
  GameStats,
} from '../types/game';
import { PhysicsEngine } from './physics';
import { CollisionDetector } from './collision';
import { Spawner } from './spawner';
import { ComboTracker, CompletedCombo } from './comboTracker';

export interface GameEngineEvents {
  onScoreUpdated: (score: number, delta: number) => void;
  onLivesUpdated: (hearts: number) => void;
  onTimeUpdated: (remainingSeconds: number) => void;
  onLevelUpdated: (level: number) => void;
  onSuperEnergyUpdated: (energy: number) => void;
  onSuperStateChanged: (isActive: boolean) => void;
  onComboCompleted: (combo: CompletedCombo) => void;
  onFruitSliced: (fruit: Fruit, contactPoint: { x: number; y: number }) => void;
  onBombExploded: (bomb: Bomb, contactPoint: { x: number; y: number }) => void;
  onFruitMissed: (fruit: Fruit) => void;
  onDamageTaken: () => void;
  onGameOver: (stats: GameStats) => void;
  onStateChanged: (state: GameState) => void;
}

export class GameEngine {
  public state: GameState = 'menu';
  public mode: GameMode = 'normal';

  // Regras da partida
  public score: number = 0;
  public hearts: number = 5;
  public maxHearts: number = 5;
  public missedFruitsCount: number = 0; // cada 3 perde 1 coração
  public elapsedActiveSeconds: number = 0;
  public maxMatchSeconds: number = 90;

  // Habilidade Super
  public superEnergy: number = 0; // 0 a 100
  public isSuperActive: boolean = false;
  public superTimeRemaining: number = 0; // 5 segundos ativos
  public supersActivatedCount: number = 0;

  // Proteção contra dano
  public damageInvulnerabilityUntil: number = 0; // 1 segundo de proteção

  // Assistência Dinâmica
  private recentDamageTimestamps: number[] = [];
  public dynamicAssistanceActive: boolean = false;
  public dynamicAssistanceUsedInMatch: boolean = false;
  private assistanceWavesRemaining: number = 0;

  // Coleções de jogo
  public fruits: Fruit[] = [];
  public bombs: Bomb[] = [];
  public slicedHalves: SlicedHalf[] = [];
  public particles: Particle[] = [];
  public juiceSplatters: JuiceSplatter[] = [];
  public floatingTexts: FloatingText[] = [];
  public bladePoints: BladePoint[] = [];

  // Módulos
  private spawner: Spawner = new Spawner();
  private comboTracker: ComboTracker = new ComboTracker();
  private events: GameEngineEvents;

  // Estatísticas
  public totalFruitsCut: number = 0;
  public totalFruitsMissed: number = 0;
  public totalBombsHit: number = 0;
  public bestComboCount: number = 0;

  // Calibração
  public profile: CalibrationProfile | null = null;
  public minCutSpeed: number = 0; // 0 px/s: encostou no objeto, corta imediatamente!

  // Lâmina anterior
  private lastBladePos: { x: number; y: number; time: number } | null = null;

  // Countdown para retormar
  public countdownNumber: number = 3;

  constructor(events: GameEngineEvents) {
    this.events = events;
  }

  public getCurrentComboMultiplier(): number {
    return this.comboTracker.getCurrentMultiplier();
  }

  public setMode(mode: GameMode): void {
    this.mode = mode;
  }

  public setProfile(profile: CalibrationProfile | null): void {
    this.profile = profile;
    if (profile && profile.minCutSpeed) {
      this.minCutSpeed = profile.minCutSpeed;
    }
  }

  public startMatch(mode: GameMode = 'normal'): void {
    this.mode = mode;
    this.score = 0;
    this.hearts = 5;
    this.missedFruitsCount = 0;
    this.elapsedActiveSeconds = 0;
    this.superEnergy = 0;
    this.isSuperActive = false;
    this.superTimeRemaining = 0;
    this.supersActivatedCount = 0;
    this.damageInvulnerabilityUntil = 0;
    this.recentDamageTimestamps = [];
    this.dynamicAssistanceActive = false;
    this.dynamicAssistanceUsedInMatch = false;
    this.assistanceWavesRemaining = 0;

    this.fruits = [];
    this.bombs = [];
    this.slicedHalves = [];
    this.particles = [];
    this.juiceSplatters = [];
    this.floatingTexts = [];
    this.bladePoints = [];
    this.lastBladePos = null;

    this.totalFruitsCut = 0;
    this.totalFruitsMissed = 0;
    this.totalBombsHit = 0;
    this.bestComboCount = 0;

    this.comboTracker.reset();

    this.state = 'playing';
    this.events.onStateChanged('playing');
    this.events.onScoreUpdated(0, 0);
    this.events.onLivesUpdated(5);
    this.events.onTimeUpdated(90);
    this.events.onLevelUpdated(1);
    this.events.onSuperEnergyUpdated(0);
    this.events.onSuperStateChanged(false);
  }

  public pauseMatch(): void {
    if (this.state === 'playing') {
      this.state = 'paused';
      this.comboTracker.reset();
      this.events.onStateChanged('paused');
    }
  }

  public resumeMatchWithCountdown(onReady: () => void): void {
    if (this.state === 'paused') {
      this.state = 'countdown';
      this.events.onStateChanged('countdown');
      this.countdownNumber = 3;

      const timer = setInterval(() => {
        this.countdownNumber--;
        if (this.countdownNumber <= 0) {
          clearInterval(timer);
          this.state = 'playing';
          this.events.onStateChanged('playing');
          this.lastBladePos = null; // reseta lâmina para não gerar corte ao despausar
          onReady();
        }
      }, 1000);
    }
  }

  public activateSuper(): boolean {
    if (this.state !== 'playing' || this.isSuperActive || this.superEnergy < 100) {
      return false;
    }

    this.isSuperActive = true;
    this.superTimeRemaining = 5.0; // 5 segundos
    this.superEnergy = 0;
    this.supersActivatedCount++;
    this.events.onSuperEnergyUpdated(0);
    this.events.onSuperStateChanged(true);

    this.addFloatingText('CHAKRA LIBERADO!', window.innerWidth / 2, window.innerHeight * 0.45, '#f97316', 1.8, 2.0);
    return true;
  }

  /**
   * Atualização principal de um frame do jogo (delta-time em segundos).
   */
  public update(dt: number, canvasW: number, canvasH: number, now: number): void {
    if (this.state !== 'playing') {
      return;
    }

    // 1. Atualiza tempo de partida (máximo 90s)
    this.elapsedActiveSeconds += dt;
    const remainingTime = Math.max(0, this.maxMatchSeconds - this.elapsedActiveSeconds);
    this.events.onTimeUpdated(Math.ceil(remainingTime));

    const currentLevel = Spawner.getLevel(this.elapsedActiveSeconds);
    this.events.onLevelUpdated(currentLevel);

    // 2. Atualiza estado do Super
    if (this.isSuperActive) {
      this.superTimeRemaining -= dt;
      if (this.superTimeRemaining <= 0) {
        this.isSuperActive = false;
        this.superTimeRemaining = 0;
        this.events.onSuperStateChanged(false);
      }
    }

    const slowMotionFactor = this.isSuperActive ? 0.65 : 1.0;

    // 3. Spawner de ondas
    if (
      this.spawner.shouldSpawnWave(
        now,
        this.elapsedActiveSeconds,
        currentLevel,
        this.mode,
        this.dynamicAssistanceActive
      )
    ) {
      const { fruits: newF, bombs: newB } = this.spawner.spawnWave(
        now,
        canvasW,
        canvasH,
        this.elapsedActiveSeconds,
        currentLevel,
        this.mode,
        this.profile,
        this.bombs.length,
        this.dynamicAssistanceActive
      );

      this.fruits.push(...newF);
      this.bombs.push(...newB);

      if (this.dynamicAssistanceActive) {
        this.assistanceWavesRemaining--;
        if (this.assistanceWavesRemaining <= 0) {
          this.dynamicAssistanceActive = false;
        }
      }
    }

    // 4. Física dos objetos
    const cutZoneTop = canvasH * 0.15;
    const cutZoneBottom = canvasH * 0.85;

    const { activeFruits, missedFruits } = PhysicsEngine.updateFruits(
      this.fruits,
      dt,
      canvasH,
      cutZoneTop,
      cutZoneBottom,
      slowMotionFactor
    );
    this.fruits = activeFruits;

    // Trata frutas perdidas
    for (const missed of missedFruits) {
      this.handleFruitMissed(missed);
    }

    this.slicedHalves = PhysicsEngine.updateSlicedHalves(this.slicedHalves, dt, canvasH, slowMotionFactor);
    this.bombs = PhysicsEngine.updateBombs(this.bombs, dt, canvasH, slowMotionFactor);
    this.particles = PhysicsEngine.updateParticles(this.particles, dt);
    this.juiceSplatters = PhysicsEngine.updateJuiceSplatters(this.juiceSplatters, now);

    // 5. Atualiza textos flutuantes
    this.floatingTexts = this.floatingTexts.filter((t) => {
      const age = (now - t.createdAt) / 1000;
      if (age >= t.duration) return false;
      t.y -= 35 * dt;
      t.alpha = Math.max(0, 1.0 - age / t.duration);
      return true;
    });

    // 6. Atualiza pontos da lâmina (desvanecem em ~200ms)
    this.bladePoints = this.bladePoints.filter((p) => now - p.timestamp <= 200);

    // 7. Verifica finalização do combo atual
    const combo = this.comboTracker.finalizeGesture(now);
    if (combo) {
      // Aplica bônus multiplicador do Super se ativo (dobra pontos)
      const finalBonus = this.isSuperActive ? combo.bonusPoints * 2 : combo.bonusPoints;
      this.addScore(finalBonus, combo.centroid.x, combo.centroid.y);

      // Super ganha +8 de energia extra por combo concluído
      this.addSuperEnergy(8);

      if (combo.count > this.bestComboCount) {
        this.bestComboCount = combo.count;
      }

      this.addFloatingText(combo.message, combo.centroid.x, combo.centroid.y - 30, '#facc15', 1.5, 1.4);
      this.events.onComboCompleted(combo);
    }

    // 8. Checa condições de fim de partida
    if (remainingTime <= 0) {
      this.endMatch('time_up');
    } else if (this.hearts <= 0) {
      this.endMatch('lives_depleted');
    }
  }

  /**
   * Processa a entrada do dedo indicador ou mouse/toque.
   */
  public handleBladeInput(
    x: number,
    y: number,
    isCutting: boolean,
    now: number
  ): void {
    if (this.state !== 'playing') {
      this.lastBladePos = null;
      return;
    }

    this.bladePoints.push({
      x,
      y,
      timestamp: now,
      isCutting,
    });

    // Se o corte não está ativo (dedo recolhido ou palma aberta), reinicia histórico
    if (!isCutting) {
      this.lastBladePos = null;
      return;
    }

    const bladeHitRadius = this.isSuperActive ? 46 : 34;

    if (!this.lastBladePos) {
      this.lastBladePos = { x, y, time: now };

      // Toque instantâneo imediato: só de encostar, corta!
      for (const fruit of this.fruits) {
        if (!fruit.sliced && Math.hypot(fruit.x - x, fruit.y - y) <= fruit.radius + bladeHitRadius) {
          this.handleFruitCut(fruit, 0, 150, { x, y }, now);
        }
      }
      return;
    }

    const dt = Math.max((now - this.lastBladePos.time) / 1000, 0.001);

    // Detecção Contínua de Colisão (CCD)
    const hits = CollisionDetector.checkBladeSegment(
      this.lastBladePos.x,
      this.lastBladePos.y,
      x,
      y,
      dt,
      0, // Zero velocidade mínima: encostou, cortou!
      this.fruits,
      this.bombs,
      bladeHitRadius
    );

    for (const hit of hits) {
      if (hit.isBomb) {
        this.handleBombCut(hit.target as Bomb, hit.contactPoint, now);
      } else {
        this.handleFruitCut(hit.target as Fruit, hit.sliceAngle, hit.cutSpeed, hit.contactPoint, now);
      }
    }

    this.lastBladePos = { x, y, time: now };
  }

  public resetBlade(): void {
    this.lastBladePos = null;
    this.bladePoints = [];
  }

  private handleFruitCut(
    fruit: Fruit,
    sliceAngle: number,
    cutSpeed: number,
    contactPoint: { x: number; y: number },
    now: number
  ): void {
    if (fruit.sliced) return; // registro único de acerto por objeto
    fruit.sliced = true;
    fruit.sliceAngle = sliceAngle;
    fruit.sliceTime = now;
    this.totalFruitsCut++;

    // Divide em duas metades físicas
    const [half1, half2] = PhysicsEngine.splitFruit(fruit, sliceAngle, cutSpeed);
    this.slicedHalves.push(half1, half2);

    // Efeitos de partículas e suco
    this.spawnSliceParticles(contactPoint.x, contactPoint.y, fruit.color, fruit.internalColor, sliceAngle);
    this.spawnJuiceSplatter(contactPoint.x, contactPoint.y, fruit.internalColor, now);

    // Pontos básicos (dobrados durante Super)
    const multiplier = this.isSuperActive ? 2 : 1;
    const pointsGained = fruit.points * multiplier;
    this.addScore(pointsGained, contactPoint.x, contactPoint.y);

    // Adiciona energia do Super (+4 por fruta cortada)
    this.addSuperEnergy(4);

    // Registra no combo contínuo
    this.comboTracker.registerFruitCut(fruit, now);

    // Texto de pontos flutuante
    this.addFloatingText(
      `+${pointsGained}`,
      contactPoint.x,
      contactPoint.y - 10,
      fruit.isSpecial ? '#f59e0b' : '#38bdf8',
      fruit.isSpecial ? 1.4 : 1.1,
      1.0
    );

    this.events.onFruitSliced(fruit, contactPoint);
  }

  private handleBombCut(
    bomb: Bomb,
    contactPoint: { x: number; y: number },
    now: number
  ): void {
    if (bomb.exploded) return;
    bomb.exploded = true;
    bomb.explodeTime = now;
    this.totalBombsHit++;

    // Efeitos de explosão
    this.spawnBombExplosion(contactPoint.x, contactPoint.y);

    // Reset do combo
    this.comboTracker.reset();

    // Verificação de período de invulnerabilidade (1 segundo após dano)
    if (now < this.damageInvulnerabilityUntil) {
      return;
    }

    // Aplica penalidade: -50 pontos (pontuação nunca fica negativa)
    this.score = Math.max(0, this.score - bomb.pointsPenalty);
    this.events.onScoreUpdated(this.score, -bomb.pointsPenalty);

    // Perde 1 coração
    this.hearts = Math.max(0, this.hearts - 1);
    this.events.onLivesUpdated(this.hearts);
    this.events.onDamageTaken();

    // Concede 1 segundo de proteção contra novas perdas
    this.damageInvulnerabilityUntil = now + 1000;

    // Registra dano para verificação de assistência dinâmica (2 corações em 5 segundos)
    this.recentDamageTimestamps.push(now);
    this.checkDynamicAssistance(now);

    this.addFloatingText('-50', contactPoint.x, contactPoint.y - 15, '#ef4444', 1.5, 1.2);
    this.events.onBombExploded(bomb, contactPoint);
  }

  private handleFruitMissed(fruit: Fruit): void {
    this.totalFruitsMissed++;
    this.missedFruitsCount++;

    this.events.onFruitMissed(fruit);

    // A cada 3 frutas perdidas que atravessaram a zona útil, retira 1 coração
    if (this.missedFruitsCount >= 3) {
      this.missedFruitsCount = 0;
      const now = performance.now();

      if (now >= this.damageInvulnerabilityUntil) {
        this.hearts = Math.max(0, this.hearts - 1);
        this.events.onLivesUpdated(this.hearts);
        this.events.onDamageTaken();
        this.damageInvulnerabilityUntil = now + 1000;

        this.recentDamageTimestamps.push(now);
        this.checkDynamicAssistance(now);
      }
    }
  }

  private checkDynamicAssistance(now: number): void {
    // Filtra danos ocorridos nos últimos 5 segundos
    this.recentDamageTimestamps = this.recentDamageTimestamps.filter((t) => now - t <= 5000);

    // Se o jogador perdeu 2 corações em 5 segundos: alívio dinâmico
    if (this.recentDamageTimestamps.length >= 2) {
      this.dynamicAssistanceActive = true;
      this.dynamicAssistanceUsedInMatch = true;
      this.assistanceWavesRemaining = 2; // alivia nas próximas 2 ondas
      this.recentDamageTimestamps = [];
    }
  }

  private addScore(points: number, x: number, y: number): void {
    this.score += points;
    this.events.onScoreUpdated(this.score, points);
  }

  private addSuperEnergy(amount: number): void {
    if (this.isSuperActive) return; // Não recarrega enquanto o Super estiver ativo
    this.superEnergy = Math.min(100, this.superEnergy + amount);
    this.events.onSuperEnergyUpdated(this.superEnergy);
  }

  private addFloatingText(
    text: string,
    x: number,
    y: number,
    color: string,
    scale: number,
    duration: number
  ): void {
    this.floatingTexts.push({
      id: `text_${Date.now()}_${Math.random()}`,
      text,
      x,
      y,
      color,
      scale,
      alpha: 1.0,
      createdAt: performance.now(),
      duration,
    });
  }

  private spawnSliceParticles(
    x: number,
    y: number,
    outerColor: string,
    innerColor: string,
    sliceAngle: number
  ): void {
    const perp = sliceAngle + Math.PI / 2;
    for (let i = 0; i < 18; i++) {
      const angle = perp + (Math.random() - 0.5) * 1.5;
      const speed = 120 + Math.random() * 260;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 50,
        life: 0.5 + Math.random() * 0.4,
        maxLife: 0.9,
        size: 3 + Math.random() * 5,
        color: Math.random() > 0.4 ? innerColor : outerColor,
        alpha: 1.0,
        shape: Math.random() > 0.3 ? 'droplet' : 'spark',
      });
    }
  }

  private spawnJuiceSplatter(x: number, y: number, color: string, now: number): void {
    const droplets: Array<{ ox: number; oy: number; r: number }> = [];
    for (let i = 0; i < 7; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 15 + Math.random() * 45;
      droplets.push({
        ox: Math.cos(angle) * dist,
        oy: Math.sin(angle) * dist,
        r: 3 + Math.random() * 7,
      });
    }

    this.juiceSplatters.push({
      x,
      y,
      radius: 20 + Math.random() * 15,
      color,
      alpha: 0.7,
      createdAt: now,
      droplets,
    });
  }

  private spawnBombExplosion(x: number, y: number): void {
    // Partículas de fumaça escura e fogo roxo/vermelho
    for (let i = 0; i < 35; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 80 + Math.random() * 320;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.6 + Math.random() * 0.6,
        maxLife: 1.2,
        size: 5 + Math.random() * 9,
        color: Math.random() > 0.5 ? '#ef4444' : Math.random() > 0.5 ? '#f97316' : '#1e1b4b',
        alpha: 1.0,
        shape: Math.random() > 0.4 ? 'smoke' : 'spark',
      });
    }
  }

  public endMatch(reason: 'time_up' | 'lives_depleted' | 'manual_exit'): void {
    if (this.state === 'gameover') return;
    this.state = 'gameover';
    this.events.onStateChanged('gameover');

    const stats: GameStats = {
      score: this.score,
      fruitsCut: this.totalFruitsCut,
      fruitsMissed: this.totalFruitsMissed,
      bombsHit: this.totalBombsHit,
      bestCombo: this.bestComboCount,
      supersActivated: this.supersActivatedCount,
      highestLevel: Spawner.getLevel(this.elapsedActiveSeconds),
      timePlayedSeconds: Math.round(this.elapsedActiveSeconds),
      gameOverReason: reason,
      mode: this.mode,
      dynamicAssistanceUsed: this.dynamicAssistanceUsedInMatch,
      date: new Date().toISOString(),
    };

    this.events.onGameOver(stats);
  }
}
