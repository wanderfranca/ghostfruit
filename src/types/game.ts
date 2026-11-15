export type FruitType = 'watermelon' | 'apple' | 'orange' | 'banana' | 'dragonfruit' | 'starfruit';

export interface Fruit {
  id: string;
  type: FruitType;
  isSpecial: boolean; // Fruta especial = +25 pontos
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  rotation: number;
  vRot: number;
  sliced: boolean;
  sliceAngle: number;
  sliceTime?: number;
  missed: boolean;
  points: number;
  color: string;
  glowColor: string;
  internalColor: string;
  seedColor: string;
  hasBeenInCutZone: boolean;
}

export interface SlicedHalf {
  id: string;
  type: FruitType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  rotation: number;
  vRot: number;
  sliceAngle: number;
  isLeftHalf: boolean;
  createdAt: number;
  color: string;
  internalColor: string;
  seedColor: string;
}

export interface Bomb {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  rotation: number;
  vRot: number;
  exploded: boolean;
  explodeTime?: number;
  pointsPenalty: number; // 50 pontos
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  alpha: number;
  shape: 'spark' | 'droplet' | 'ghost_orb' | 'smoke';
}

export interface JuiceSplatter {
  x: number;
  y: number;
  radius: number;
  color: string;
  alpha: number;
  createdAt: number;
  droplets: Array<{ ox: number; oy: number; r: number }>;
}

export interface FloatingText {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  scale: number;
  alpha: number;
  createdAt: number;
  duration: number;
}

export interface BladePoint {
  x: number;
  y: number;
  timestamp: number;
  isCutting: boolean;
}

export type GameMode = 'iniciante' | 'normal' | 'desafio';

export type GameState = 'menu' | 'calibrating' | 'countdown' | 'playing' | 'paused' | 'gameover';

export interface CalibrationProfile {
  hand: 'Left' | 'Right';
  centerPoint: { x: number; y: number };
  safeZone: {
    minX: number; // normalizado 0 a 1
    maxX: number;
    minY: number;
    maxY: number;
  };
  minCutSpeed: number; // pixels por milissegundo ou normalizado
  reachDistance: number;
  quality: 'Boa' | 'Regular' | 'Precisa ajustar';
  cameraDeviceId: string;
  isFrontCamera: boolean;
  isPortrait: boolean;
  calibratedAt: number;
}

export interface PortfolioCardData {
  playerName: string;
  title: string;
  website: string;
  techStack: string;
}

export interface GameStats {
  score: number;
  fruitsCut: number;
  fruitsMissed: number;
  bombsHit: number;
  bestCombo: number;
  supersActivated: number;
  highestLevel: number;
  timePlayedSeconds: number;
  gameOverReason: 'time_up' | 'lives_depleted' | 'manual_exit';
  mode: GameMode;
  dynamicAssistanceUsed: boolean;
  playerName?: string;
  isPortfolioMode?: boolean;
  date: string;
}

export interface GameSettings {
  cameraDeviceId: string;
  isFrontCamera: boolean;
  darkenLevel: number; // 0 a 80 (%)
  beautyLevel: number; // 0 a 100 (%), suavização e embelezamento facial
  showSkeleton: boolean;
  sfxVolume: number; // 0 a 100 (%)
  inputMode: 'camera' | 'touch_mouse';
  reduceMotion: boolean;
  recordAudio: boolean;
  recordMic?: boolean;
  targetResolution: '1080p' | '720p';
}

export interface HandLandmark {
  x: number;
  y: number;
  z: number;
}

export interface HandDetectionOutput {
  detected: boolean;
  handType?: 'Left' | 'Right';
  indexTip?: { x: number; y: number; z: number };
  isIndexExtended: boolean;
  isOpenPalm: boolean;
  rawLandmarks?: HandLandmark[];
  confidence: number;
}
