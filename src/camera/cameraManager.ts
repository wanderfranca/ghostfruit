export interface VideoDeviceInfo {
  deviceId: string;
  label: string;
  facingMode?: string;
}

export interface VideoTransform {
  sourceX: number;
  sourceY: number;
  sourceWidth: number;
  sourceHeight: number;
  destX: number;
  destY: number;
  destWidth: number;
  destHeight: number;
  scale: number;
  isMirrored: boolean;
}

export class CameraManager {
  private stream: MediaStream | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private currentDeviceId: string = '';
  private isFront: boolean = true;

  constructor() {
    this.videoElement = document.createElement('video');
    this.videoElement.playsInline = true;
    this.videoElement.muted = true;
    this.videoElement.autoplay = true;
    this.videoElement.setAttribute('webkit-playsinline', 'true');
  }

  public getVideoElement(): HTMLVideoElement {
    if (!this.videoElement) {
      throw new Error('Elemento de vídeo não inicializado');
    }
    return this.videoElement;
  }

  public getStream(): MediaStream | null {
    return this.stream;
  }

  public isFrontFacing(): boolean {
    return this.isFront;
  }

  public getCurrentDeviceId(): string {
    return this.currentDeviceId;
  }

  public async getAvailableCameras(): Promise<VideoDeviceInfo[]> {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
      return [];
    }

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((d) => d.kind === 'videoinput');

      return videoDevices.map((d, index) => ({
        deviceId: d.deviceId,
        label: d.label || `Câmera ${index + 1}`,
      }));
    } catch (err) {
      console.warn('Erro ao listar câmeras:', err);
      return [];
    }
  }

  public async startCamera(deviceId?: string, preferFront: boolean = true): Promise<MediaStream> {
    this.stopCamera();

    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    this.isFront = preferFront;

    // Utiliza apenas valores 'ideal' sem 'min' rígidos para evitar OverconstrainedError
    const baseVideoConstraints: MediaTrackConstraints = {
      width: { ideal: isMobile ? 1280 : 1920 },
      height: { ideal: isMobile ? 720 : 1080 },
    };

    if (deviceId) {
      baseVideoConstraints.deviceId = { exact: deviceId };
      this.currentDeviceId = deviceId;
    } else {
      baseVideoConstraints.facingMode = preferFront ? 'user' : 'environment';
    }

    let activeStream: MediaStream;

    try {
      activeStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: baseVideoConstraints,
      });
    } catch (firstErr: any) {
      // Fallback seguro caso as dimensões ideais não sejam aceitas pelo driver
      if (
        firstErr.name === 'OverconstrainedError' ||
        firstErr.name === 'ConstraintNotSatisfiedError'
      ) {
        try {
          activeStream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: preferFront ? { facingMode: 'user' } : true,
          });
        } catch (fallbackErr) {
          throw this.wrapCameraError(fallbackErr);
        }
      } else {
        throw this.wrapCameraError(firstErr);
      }
    }

    this.stream = activeStream;
    const videoTrack = this.stream.getVideoTracks()[0];

    if (videoTrack) {
      const settings = videoTrack.getSettings();
      if (settings.facingMode) {
        this.isFront = settings.facingMode === 'user';
      } else if (!deviceId) {
        this.isFront = preferFront;
      }
      if (settings.deviceId) {
        this.currentDeviceId = settings.deviceId;
      }
    }

    if (this.videoElement) {
      this.videoElement.srcObject = this.stream;
      try {
        await this.videoElement.play();
      } catch (playErr) {
        // Trata delay de inicialização do decodificador sem emitir erro espúrio
        await new Promise<void>((resolve) => {
          if (!this.videoElement) return resolve();
          this.videoElement.onloadeddata = async () => {
            try {
              await this.videoElement?.play();
            } catch {}
            resolve();
          };
          setTimeout(resolve, 800);
        });
      }
    }

    return this.stream;
  }

  private wrapCameraError(error: any): Error {
    let friendlyMessage = 'Erro desconhecido ao acessar a câmera.';
    if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
      friendlyMessage = 'Permissão negada! Conceda permissão de câmera no navegador para poder jogar.';
    } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
      friendlyMessage = 'Nenhuma câmera encontrada no seu dispositivo.';
    } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
      friendlyMessage = 'A câmera está ocupada ou inicializando. Tente novamente em instantes.';
    } else if (error.name === 'OverconstrainedError') {
      friendlyMessage = 'Resolução não suportada pela câmera.';
    }
    const wrappedError = new Error(friendlyMessage);
    (wrappedError as any).originalError = error;
    return wrappedError;
  }

  public stopCamera(): void {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    if (this.videoElement) {
      this.videoElement.srcObject = null;
    }
  }

  /**
   * Calcula o enquadramento perfeito (object-fit: cover) do vídeo no Canvas
   * garantindo que vídeo, landmarks e renderização estejam perfeitamente alinhados.
   */
  public static calculateTransform(
    videoW: number,
    videoH: number,
    canvasW: number,
    canvasH: number,
    isMirrored: boolean,
    destX: number = 0,
    destY: number = 0,
    destWidth: number = canvasW,
    destHeight: number = canvasH
  ): VideoTransform {
    if (videoW <= 0 || videoH <= 0 || destWidth <= 0 || destHeight <= 0) {
      return {
        sourceX: 0,
        sourceY: 0,
        sourceWidth: 1,
        sourceHeight: 1,
        destX,
        destY,
        destWidth,
        destHeight,
        scale: 1,
        isMirrored,
      };
    }

    const videoAspect = videoW / videoH;
    const destAspect = destWidth / destHeight;

    let sourceX = 0;
    let sourceY = 0;
    let sourceWidth = videoW;
    let sourceHeight = videoH;

    if (videoAspect > destAspect) {
      // Vídeo é mais largo que a área destino: recortar laterais
      sourceWidth = videoH * destAspect;
      sourceX = (videoW - sourceWidth) / 2;
    } else {
      // Vídeo é mais alto que a área destino: recortar topo/base
      sourceHeight = videoW / destAspect;
      sourceY = (videoH - sourceHeight) / 2;
    }

    const scale = destWidth / sourceWidth;

    return {
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      destX,
      destY,
      destWidth,
      destHeight,
      scale,
      isMirrored,
    };
  }

  /**
   * Converte landmark normalizado do MediaPipe (0 a 1 em relação ao vídeo)
   * para coordenada exata em pixels dentro do Canvas (ou sub-região de jogo).
   */
  public static mapLandmarkToCanvas(
    normX: number,
    normY: number,
    videoW: number,
    videoH: number,
    canvasW: number,
    canvasH: number,
    isMirrored: boolean,
    destX: number = 0,
    destY: number = 0,
    destWidth: number = canvasW,
    destHeight: number = canvasH
  ): { x: number; y: number } {
    const transform = CameraManager.calculateTransform(
      videoW,
      videoH,
      canvasW,
      canvasH,
      isMirrored,
      destX,
      destY,
      destWidth,
      destHeight
    );

    // Converte de [0, 1] para pixels no vídeo original
    const rawVideoX = normX * videoW;
    const rawVideoY = normY * videoH;

    // Converte para coordenadas dentro da região recortada (crop cover)
    const croppedX = rawVideoX - transform.sourceX;
    const croppedY = rawVideoY - transform.sourceY;

    // Converte para coordenadas normalizadas [0, 1] dentro da região visível
    const normCropX = croppedX / transform.sourceWidth;
    const normCropY = croppedY / transform.sourceHeight;

    // Expansão dinâmica de alcance (1.28x) centrada em 0.5:
    // Permite que o jogador alcance facilmente as bordas de qualquer tela (incluindo telas ultrawide 21:9)
    // com movimentação natural dos braços, sem precisar sair do campo de visão da câmera!
    const reachX = Math.max(0, Math.min(1, (normCropX - 0.5) * 1.28 + 0.5));
    const reachY = Math.max(0, Math.min(1, (normCropY - 0.5) * 1.22 + 0.5));

    // Escala para dimensões do Canvas / área destino
    let posX = destX + reachX * transform.destWidth;
    const posY = destY + reachY * transform.destHeight;

    // Se estiver espelhado (câmera frontal para reflexo natural de espelho):
    if (isMirrored) {
      posX = destX + (transform.destWidth - (posX - destX));
    }

    return { x: posX, y: posY };
  }
}
