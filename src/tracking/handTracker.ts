import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { CameraManager } from '../camera/cameraManager';
import { HandDetectionOutput, HandLandmark } from '../types/game';
import { Point2DFilter } from './oneEuroFilter';

export interface HandTrackerCallbacks {
  onHandDetected: (output: HandDetectionOutput) => void;
  onTrackingLost: (durationMs: number) => void;
  onTrackingRecovered: () => void;
  onOpenPalmProgress?: (progress: number) => void;
  onSuperTriggered?: () => void;
}

export class HandTracker {
  private handLandmarker: HandLandmarker | null = null;
  private isInitializing: boolean = false;
  private isRunning: boolean = false;
  private filter: Point2DFilter;

  private preferredHand: 'Left' | 'Right' = 'Right';
  private lastIndexExtendedState: boolean = false;
  private lastSeenTimestamp: number = 0;
  private consecutiveLostFrames: number = 0;
  private consecutiveDetectedFrames: number = 0;
  private hasEmittedLost: boolean = false;

  // Open Palm gesture tracker for Super ability (800ms)
  private openPalmStartTime: number = 0;
  private isPalmOpen: boolean = false;

  private callbacks: HandTrackerCallbacks;

  constructor(callbacks: HandTrackerCallbacks) {
    this.callbacks = callbacks;
    this.filter = new Point2DFilter(0.4, 0.04);
  }

  public setPreferredHand(hand: 'Left' | 'Right'): void {
    this.preferredHand = hand;
  }

  public async initialize(): Promise<void> {
    if (this.handLandmarker || this.isInitializing) return;
    this.isInitializing = true;

    try {
      // Tenta carregar WASM localmente primeiro, fallback para CDN oficial
      let vision;
      try {
        vision = await FilesetResolver.forVisionTasks('/wasm');
      } catch (e) {
        console.warn('WASM local não carregou, usando CDN jsdelivr...', e);
        vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/wasm'
        );
      }

      // Tenta modelo local em /models/hand_landmarker.task com fallback
      let modelAssetPath = '/models/hand_landmarker.task';
      try {
        const check = await fetch(modelAssetPath, { method: 'HEAD' });
        if (!check.ok) {
          modelAssetPath =
            'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';
        }
      } catch {
        modelAssetPath =
          'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';
      }

      this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath,
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numHands: 2, // Permite 2 mãos para identificar a mão ativa configurada
        minHandDetectionConfidence: 0.35,
        minHandPresenceConfidence: 0.35,
        minTrackingConfidence: 0.35,
      });

      console.log('MediaPipe HandLandmarker inicializado com sucesso.');
    } catch (err) {
      console.error('Falha ao inicializar HandLandmarker:', err);
      throw new Error(
        'Falha ao carregar o detector de mãos MediaPipe. Verifique a conexão ou suporte WebGL.'
      );
    } finally {
      this.isInitializing = false;
    }
  }

  public processVideoFrame(
    video: HTMLVideoElement,
    canvasW: number,
    canvasH: number,
    isMirrored: boolean,
    timestamp: number,
    destX: number = 0,
    destY: number = 0,
    destWidth?: number,
    destHeight?: number
  ): HandDetectionOutput {
    if (!this.handLandmarker || video.readyState < 2 || video.paused || video.ended) {
      return { detected: false, isIndexExtended: false, isOpenPalm: false, confidence: 0 };
    }

    try {
      const results = this.handLandmarker.detectForVideo(video, timestamp);

      if (!results.landmarks || results.landmarks.length === 0) {
        this.handleTrackingLoss(timestamp);
        return { detected: false, isIndexExtended: false, isOpenPalm: false, confidence: 0 };
      }

      // Encontrar a melhor mão (prioriza a mão preferida do perfil)
      let selectedHandIndex = 0;
      if (results.handednesses && results.handednesses.length > 1) {
        const matchingIdx = results.handednesses.findIndex((h) => {
          const categoryName = h[0]?.displayName || h[0]?.categoryName;
          // Em modo espelhado, a mão esquerda da câmera pode aparecer como direita
          return categoryName?.toLowerCase() === this.preferredHand.toLowerCase();
        });
        if (matchingIdx >= 0) {
          selectedHandIndex = matchingIdx;
        }
      }

      const rawLandmarks = results.landmarks[selectedHandIndex];
      const handedness = results.handednesses?.[selectedHandIndex]?.[0]?.categoryName as
        | 'Left'
        | 'Right'
        | undefined;

      this.consecutiveLostFrames = 0;
      this.consecutiveDetectedFrames++;
      this.lastSeenTimestamp = timestamp;

      if (this.hasEmittedLost && this.consecutiveDetectedFrames >= 3) {
        this.hasEmittedLost = false;
        this.callbacks.onTrackingRecovered();
      }

      // Pontos-chave da mão
      const wrist = rawLandmarks[0];
      const indexMcp = rawLandmarks[5];
      const indexPip = rawLandmarks[6];
      const indexTip = rawLandmarks[8];
      const middlePip = rawLandmarks[10];
      const middleTip = rawLandmarks[12];
      const ringTip = rawLandmarks[16];
      const pinkyTip = rawLandmarks[20];
      const thumbTip = rawLandmarks[4];

      // Verificação do indicador estendido com histerese
      const distWristTip = Math.hypot(indexTip.x - wrist.x, indexTip.y - wrist.y);
      const distWristPip = Math.hypot(indexPip.x - wrist.x, indexPip.y - wrist.y);
      const distMcpTip = Math.hypot(indexTip.x - indexMcp.x, indexTip.y - indexMcp.y);
      const distMcpPip = Math.hypot(indexPip.x - indexMcp.x, indexPip.y - indexMcp.y);

      const ratio = distWristTip / (distWristPip || 0.001);

      // Histerese para evitar oscilações na borda do gesto
      let isIndexExtended = this.lastIndexExtendedState;
      if (isIndexExtended) {
        // Para desativar, precisa recolher abaixo de 1.08
        if (ratio < 1.08 || distMcpTip < distMcpPip * 1.1) {
          isIndexExtended = false;
        }
      } else {
        // Para ativar, precisa estender acima de 1.25
        if (ratio > 1.25 && distMcpTip > distMcpPip * 1.35) {
          isIndexExtended = true;
        }
      }
      this.lastIndexExtendedState = isIndexExtended;

      // Verificação de Palma Aberta (gesto do Super)
      const distMiddleWrist = Math.hypot(middleTip.x - wrist.x, middleTip.y - wrist.y);
      const distRingWrist = Math.hypot(ringTip.x - wrist.x, ringTip.y - wrist.y);
      const distPinkyWrist = Math.hypot(pinkyTip.x - wrist.x, pinkyTip.y - wrist.y);
      const distThumbWrist = Math.hypot(thumbTip.x - wrist.x, thumbTip.y - wrist.y);

      const isOpenPalm =
        isIndexExtended &&
        distMiddleWrist > distWristPip * 1.2 &&
        distRingWrist > distWristPip * 1.1 &&
        distPinkyWrist > distWristPip * 1.0 &&
        distThumbWrist > distWristPip * 0.9;

      this.processOpenPalmGesture(isOpenPalm, timestamp);

      // Converte a ponta do indicador para coordenadas do Canvas / sub-região de jogo
      const rawScreenPos = CameraManager.mapLandmarkToCanvas(
        indexTip.x,
        indexTip.y,
        video.videoWidth,
        video.videoHeight,
        canvasW,
        canvasH,
        isMirrored,
        destX,
        destY,
        destWidth ?? canvasW,
        destHeight ?? canvasH
      );

      // Aplica One Euro Filter para suavidade adaptativa + rejeição de saltos absurdos
      const filteredPos = this.filter.filter(rawScreenPos.x, rawScreenPos.y, timestamp);

      const output: HandDetectionOutput = {
        detected: true,
        handType: handedness || this.preferredHand,
        indexTip: filteredPos ? { x: filteredPos.x, y: filteredPos.y, z: indexTip.z } : undefined,
        // Durante o gesto de carregar Super, desativa a lâmina para não haver corte involuntário
        isIndexExtended: isIndexExtended && !this.isPalmOpen,
        isOpenPalm: this.isPalmOpen,
        rawLandmarks: rawLandmarks as HandLandmark[],
        confidence: 0.9,
      };

      this.callbacks.onHandDetected(output);
      return output;
    } catch (err) {
      console.warn('Erro ao processar frame no HandLandmarker:', err);
      return { detected: false, isIndexExtended: false, isOpenPalm: false, confidence: 0 };
    }
  }

  private processOpenPalmGesture(isOpen: boolean, timestamp: number): void {
    if (isOpen) {
      if (!this.isPalmOpen) {
        this.isPalmOpen = true;
        this.openPalmStartTime = timestamp;
      }
      const elapsed = timestamp - this.openPalmStartTime;
      const progress = Math.min(1.0, elapsed / 800); // 800ms para disparar

      if (this.callbacks.onOpenPalmProgress) {
        this.callbacks.onOpenPalmProgress(progress);
      }

      if (progress >= 1.0) {
        if (this.callbacks.onSuperTriggered) {
          this.callbacks.onSuperTriggered();
        }
        // Reseta o início para não disparar em loop contínuo
        this.openPalmStartTime = timestamp + 1000;
      }
    } else {
      if (this.isPalmOpen) {
        this.isPalmOpen = false;
        if (this.callbacks.onOpenPalmProgress) {
          this.callbacks.onOpenPalmProgress(0);
        }
      }
    }
  }

  private handleTrackingLoss(timestamp: number): void {
    this.consecutiveLostFrames++;
    this.consecutiveDetectedFrames = 0;
    this.lastIndexExtendedState = false;
    this.isPalmOpen = false;

    // Só reseta o filtro suave se a mão ficar ausente por mais de 5 frames seguidos (>160ms)
    // Isso evita que um piscar rápido durante um corte em alta velocidade quebre o golpe
    if (this.consecutiveLostFrames > 5) {
      this.filter.reset();
    }

    if (this.callbacks.onOpenPalmProgress) {
      this.callbacks.onOpenPalmProgress(0);
    }

    if (this.lastSeenTimestamp > 0) {
      const lostDuration = timestamp - this.lastSeenTimestamp;
      // Pausa automática após aproximadamente 700ms de perda contínua de rastreamento
      if (lostDuration >= 700 && !this.hasEmittedLost) {
        this.hasEmittedLost = true;
        this.callbacks.onTrackingLost(lostDuration);
      }
    }
  }

  public reset(): void {
    this.filter.reset();
    this.lastIndexExtendedState = false;
    this.lastSeenTimestamp = 0;
    this.consecutiveLostFrames = 0;
    this.consecutiveDetectedFrames = 0;
    this.hasEmittedLost = false;
    this.isPalmOpen = false;
  }

  public destroy(): void {
    this.reset();
    if (this.handLandmarker) {
      this.handLandmarker.close();
      this.handLandmarker = null;
    }
  }
}
