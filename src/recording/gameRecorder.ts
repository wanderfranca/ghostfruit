export interface RecordingResult {
  blob: Blob;
  url: string;
  mimeType: string;
  isMp4: boolean;
  filename: string;
  durationSeconds: number;
}

export class GameRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private isRecording: boolean = false;
  private startTime: number = 0;
  private timerInterval: any = null;
  private currentDuration: number = 0;
  private mimeTypeUsed: string = '';
  private isMp4Native: boolean = false;

  private streamDest: MediaStreamAudioDestinationNode | null = null;
  private keepAliveOsc: OscillatorNode | null = null;
  private keepAliveGain: GainNode | null = null;
  private micStream: MediaStream | null = null;
  private micSource: MediaStreamAudioSourceNode | null = null;
  private connectedSourceNode: AudioNode | null = null;

  private onDurationUpdate?: (seconds: number) => void;

  constructor(onDurationUpdate?: (seconds: number) => void) {
    this.onDurationUpdate = onDurationUpdate;
  }

  public isCurrentlyRecording(): boolean {
    return this.isRecording;
  }

  public getCurrentDuration(): number {
    return this.currentDuration;
  }

  public static getSupportedMimeType(): { mimeType: string; isMp4: boolean } {
    if (typeof MediaRecorder === 'undefined') {
      return { mimeType: '', isMp4: false };
    }

    // Candidatos ordenados: formatos com suporte comprovado a áudio estéreo/mono
    const candidates = [
      { type: 'video/mp4; codecs="avc1.42E01E, mp4a.40.2"', isMp4: true },
      { type: 'video/mp4; codecs="avc1, mp4a.40.2"', isMp4: true },
      { type: 'video/mp4; codecs="avc1.42001e, mp4a.40.2"', isMp4: true },
      { type: 'video/mp4; codecs="avc1, opus"', isMp4: true },
      { type: 'video/mp4; codecs=h264,aac', isMp4: true },
      { type: 'video/mp4', isMp4: true },
      // WebM com suporte nativo e áudio Opus comprovado no Chromium
      { type: 'video/webm; codecs="vp9, opus"', isMp4: false },
      { type: 'video/webm; codecs="vp8, opus"', isMp4: false },
      { type: 'video/webm; codecs="h264, opus"', isMp4: false },
      { type: 'video/webm', isMp4: false },
    ];

    for (const candidate of candidates) {
      if (MediaRecorder.isTypeSupported(candidate.type)) {
        return { mimeType: candidate.type, isMp4: candidate.isMp4 };
      }
    }

    return { mimeType: '', isMp4: false };
  }

  private cleanupAudio(): void {
    if (this.keepAliveOsc) {
      try {
        this.keepAliveOsc.stop();
      } catch (_) {}
      try {
        this.keepAliveOsc.disconnect();
      } catch (_) {}
      this.keepAliveOsc = null;
    }
    if (this.keepAliveGain) {
      try {
        this.keepAliveGain.disconnect();
      } catch (_) {}
      this.keepAliveGain = null;
    }
    if (this.micSource) {
      try {
        this.micSource.disconnect();
      } catch (_) {}
      this.micSource = null;
    }
    if (this.micStream) {
      try {
        this.micStream.getTracks().forEach((track) => track.stop());
      } catch (_) {}
      this.micStream = null;
    }
    if (this.connectedSourceNode && this.streamDest) {
      try {
        this.connectedSourceNode.disconnect(this.streamDest);
      } catch (_) {}
      this.connectedSourceNode = null;
      this.streamDest = null;
    }
  }

  public async startRecording(
    canvas: HTMLCanvasElement,
    audioDestinationNode: AudioNode | null = null,
    includeMic: boolean = false
  ): Promise<void> {
    if (this.isRecording) return;
    this.recordedChunks = [];

    // Limpeza preventiva de áudio anterior
    this.cleanupAudio();

    // Captura o stream do canvas a 30 fps
    const canvasStream = canvas.captureStream(30);

    // Adiciona faixa de áudio se disponível
    const combinedTracks: MediaStreamTrack[] = [...canvasStream.getVideoTracks()];

    if (audioDestinationNode && (audioDestinationNode.context as any).createMediaStreamDestination) {
      const audioCtx = audioDestinationNode.context as AudioContext;
      if (audioCtx.state === 'suspended') {
        try {
          await audioCtx.resume();
        } catch (e) {
          console.warn('Falha ao resumir AudioContext para gravação:', e);
        }
      }

      this.streamDest = audioCtx.createMediaStreamDestination();
      this.connectedSourceNode = audioDestinationNode;
      audioDestinationNode.connect(this.streamDest);

      // Sinal de áudio contínuo inaudível para manter o clock do MediaRecorder ativo
      // e evitar que o navegador descarte a trilha de áudio nos momentos de silêncio
      try {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        gain.gain.setValueAtTime(0.00001, audioCtx.currentTime);
        osc.connect(gain);
        gain.connect(this.streamDest);
        osc.start();
        this.keepAliveOsc = osc;
        this.keepAliveGain = gain;
      } catch (e) {
        console.warn('Não foi possível iniciar sinal de keepalive de áudio:', e);
      }

      // Mixagem unificada do microfone no mesmo streamDest
      if (includeMic) {
        try {
          const micStream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
          });
          this.micStream = micStream;
          const micSource = audioCtx.createMediaStreamSource(micStream);
          micSource.connect(this.streamDest);
          this.micSource = micSource;
        } catch (e) {
          console.warn('Microfone não autorizado ou indisponível:', e);
        }
      }

      const audioTrack = this.streamDest.stream.getAudioTracks()[0];
      if (audioTrack) {
        combinedTracks.push(audioTrack);
      }
    }

    const outputStream = new MediaStream(combinedTracks);
    const { mimeType, isMp4 } = GameRecorder.getSupportedMimeType();

    if (!mimeType) {
      throw new Error('Seu navegador não suporta gravação de vídeo via MediaRecorder.');
    }

    this.mimeTypeUsed = mimeType;
    this.isMp4Native = isMp4;

    const options: MediaRecorderOptions = {
      mimeType,
      videoBitsPerSecond: 8_000_000, // 8 Mbps para nitidez do jogo arcade
      audioBitsPerSecond: 128_000,   // 128 kbps áudio de alta fidelidade
    };

    try {
      this.mediaRecorder = new MediaRecorder(outputStream, options);
    } catch (err) {
      // Tenta sem especificar o bitrate se o navegador reclamar
      this.mediaRecorder = new MediaRecorder(outputStream, { mimeType });
    }

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        this.recordedChunks.push(event.data);
      }
    };

    this.mediaRecorder.start(500); // grava chunks a cada 500ms
    this.isRecording = true;
    this.startTime = Date.now();
    this.currentDuration = 0;

    this.timerInterval = setInterval(() => {
      this.currentDuration = Math.floor((Date.now() - this.startTime) / 1000);
      if (this.onDurationUpdate) {
        this.onDurationUpdate(this.currentDuration);
      }
    }, 500);
  }

  public stopRecording(score: number): Promise<RecordingResult> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder || !this.isRecording) {
        reject(new Error('Nenhuma gravação ativa'));
        return;
      }

      clearInterval(this.timerInterval);
      this.isRecording = false;

      this.mediaRecorder.onstop = () => {
        this.cleanupAudio();

        const finalBlob = new Blob(this.recordedChunks, { type: this.mimeTypeUsed });
        const url = URL.createObjectURL(finalBlob);

        const now = new Date();
        const dateStr = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const ext = this.isMp4Native ? 'mp4' : 'webm';
        const filename = `ghost-fruit-${dateStr}-${score}pts.${ext}`;

        resolve({
          blob: finalBlob,
          url,
          mimeType: this.mimeTypeUsed,
          isMp4: this.isMp4Native,
          filename,
          durationSeconds: this.currentDuration,
        });
      };

      this.mediaRecorder.stop();
    });
  }

  public cancelRecording(): void {
    if (this.mediaRecorder && this.isRecording) {
      clearInterval(this.timerInterval);
      this.isRecording = false;
      this.cleanupAudio();
      this.mediaRecorder.stop();
      this.recordedChunks = [];
    }
  }
}
