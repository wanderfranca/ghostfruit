import React, { useEffect, useRef, useState, useCallback } from 'react';
import { CameraManager, VideoDeviceInfo } from './camera/cameraManager';
import { HandTracker } from './tracking/handTracker';
import { CalibrationManager } from './tracking/calibrationManager';
import { GameEngine } from './engine/gameEngine';
import { CanvasRenderer } from './rendering/canvasRenderer';
import { SoundManager } from './audio/soundManager';
import { GameRecorder, RecordingResult } from './recording/gameRecorder';
import {
  GameMode,
  GameState,
  CalibrationProfile,
  GameStats,
  GameSettings,
  HandDetectionOutput,
} from './types/game';

import { StartScreen } from './components/StartScreen';
import { GameHUD } from './components/GameHUD';
import { CalibrationWizard } from './components/CalibrationWizard';
import { PauseModal } from './components/PauseModal';
import { GameOverModal } from './components/GameOverModal';
import { SettingsModal } from './components/SettingsModal';

export const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Instâncias dos subsistemas
  const cameraManagerRef = useRef<CameraManager>(new CameraManager());
  const soundManagerRef = useRef<SoundManager>(new SoundManager());
  const rendererRef = useRef<CanvasRenderer | null>(null);
  const gameEngineRef = useRef<GameEngine | null>(null);
  const handTrackerRef = useRef<HandTracker | null>(null);
  const recorderRef = useRef<GameRecorder>(new GameRecorder());

  // Estados de controle
  const [gameState, setGameState] = useState<GameState>('menu');
  const [gameMode, setGameMode] = useState<GameMode>('normal');
  const [isMediaPipeReady, setIsMediaPipeReady] = useState<boolean>(false);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isRequestingCamera, setIsRequestingCamera] = useState<boolean>(false);
  const [availableCameras, setAvailableCameras] = useState<VideoDeviceInfo[]>([]);

  // HUD States
  const [score, setScore] = useState<number>(0);
  const [hearts, setHearts] = useState<number>(5);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(90);
  const [currentLevel, setCurrentLevel] = useState<number>(1);
  const [superEnergy, setSuperEnergy] = useState<number>(0);
  const [isSuperActive, setIsSuperActive] = useState<boolean>(false);
  const [superTimeRemaining, setSuperTimeRemaining] = useState<number>(0);
  const [countdownNum, setCountdownNum] = useState<number>(3);
  const [isHandDetected, setIsHandDetected] = useState<boolean>(false);
  const [isIndexExtended, setIsIndexExtended] = useState<boolean>(false);
  const [openPalmProgress, setOpenPalmProgress] = useState<number>(0);
  const [currentFingerPos, setCurrentFingerPos] = useState<{ x: number; y: number } | null>(null);

  // Gravação
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingDuration, setRecordingDuration] = useState<number>(0);
  const [recordingResult, setRecordingResult] = useState<RecordingResult | null>(null);
  const [isPortfolioMode, setIsPortfolioMode] = useState<boolean>(false);
  const [playerName, setPlayerName] = useState<string>('Wander França');

  const gameStateRef = useRef<GameState>(gameState);
  gameStateRef.current = gameState;
  const isPortfolioModeRef = useRef<boolean>(isPortfolioMode);
  isPortfolioModeRef.current = isPortfolioMode;

  const shouldRecordAfterCalibration = useRef<{ record: boolean; isPortfolio: boolean; name: string }>({
    record: false,
    isPortfolio: false,
    name: 'Wander França',
  });

  // Modais
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [finalStats, setFinalStats] = useState<GameStats | null>(null);

  // Calibração
  const [profile, setProfile] = useState<CalibrationProfile | null>(null);

  // Configurações
  const [settings, setSettings] = useState<GameSettings>({
    cameraDeviceId: '',
    isFrontCamera: true,
    darkenLevel: 35,
    beautyLevel: 55, // 55% suavização e embelezamento facial natural (efeito selfie smartphone)
    showSkeleton: false,
    sfxVolume: 80,
    inputMode: 'camera',
    reduceMotion: false,
    recordAudio: true,
    recordMic: false,
    targetResolution: '1080p',
  });

  // Dimensões do Canvas
  const [canvasDimensions, setCanvasDimensions] = useState<{ width: number; height: number }>({
    width: 1280,
    height: 720,
  });

  // Último resultado da mão para o renderizador
  const latestHandOutputRef = useRef<HandDetectionOutput | null>(null);
  const lastHandSeenTimeRef = useRef<number>(0);

  // Inicializa o Motor de Jogo e o Som
  useEffect(() => {
    soundManagerRef.current.setVolume(settings.sfxVolume / 100);

    const engine = new GameEngine({
      onScoreUpdated: (newScore) => setScore(newScore),
      onLivesUpdated: (newHearts) => setHearts(newHearts),
      onTimeUpdated: (secs) => setRemainingSeconds(secs),
      onLevelUpdated: (lvl) => setCurrentLevel(lvl),
      onSuperEnergyUpdated: (energy) => setSuperEnergy(energy),
      onSuperStateChanged: (active) => setIsSuperActive(active),
      onComboCompleted: (combo) => soundManagerRef.current.playCombo(combo.multiplier),
      onFruitSliced: (fruit) => {
        soundManagerRef.current.playSlice(fruit.isSpecial);
        soundManagerRef.current.playWhoosh();
      },
      onBombExploded: () => soundManagerRef.current.playBombExplosion(),
      onFruitMissed: () => {},
      onDamageTaken: () => soundManagerRef.current.playDamage(),
      onGameOver: (stats) => handleMatchEnded(stats),
      onStateChanged: (state) => setGameState(state),
    });

    gameEngineRef.current = engine;

    // Configura o gravador de vídeo
    recorderRef.current = new GameRecorder((durationSecs) => {
      setRecordingDuration(durationSecs);
    });

    // Inicializa o rastreador MediaPipe HandLandmarker
    const tracker = new HandTracker({
      onHandDetected: (output) => {
        latestHandOutputRef.current = output;
        setIsHandDetected(output.detected);
        setIsIndexExtended(output.isIndexExtended);
        if (output.indexTip) {
          setCurrentFingerPos({ x: output.indexTip.x, y: output.indexTip.y });
        }
      },
      onTrackingLost: (_durationMs) => {
        setIsHandDetected(false);
        setIsIndexExtended(false);
        // Não pausa a partida automaticamente: movimentos rápidos empolgados do jogador
        // não devem travar o jogo de surpresa. O jogador pausa quando quiser pelo botão.
      },
      onTrackingRecovered: () => {
        setIsHandDetected(true);
        // Retoma com contagem de 3 segundos se estava pausado
        if (gameEngineRef.current && gameEngineRef.current.state === 'paused') {
          gameEngineRef.current.resumeMatchWithCountdown(() => {
            soundManagerRef.current.playCountdown(0);
          });
        }
      },
      onOpenPalmProgress: (prog) => setOpenPalmProgress(prog),
      onSuperTriggered: () => {
        if (gameEngineRef.current) {
          const activated = gameEngineRef.current.activateSuper();
          if (activated) {
            soundManagerRef.current.playSuperActivate();
          }
        }
      },
    });

    handTrackerRef.current = tracker;
    tracker
      .initialize()
      .then(() => {
        setIsMediaPipeReady(true);
      })
      .catch((err) => {
        console.error('Falha ao inicializar MediaPipe:', err);
      });

    // Inicia a câmera se a permissão já foi concedida anteriormente
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions
        .query({ name: 'camera' as any })
        .then((res) => {
          if (res.state === 'granted') {
            startCameraStream();
          }
        })
        .catch(() => {});
    }

    return () => {
      tracker.destroy();
      cameraManagerRef.current.stopCamera();
    };
  }, []);

  // Atualiza volume e configurações sonoras
  useEffect(() => {
    soundManagerRef.current.setVolume(settings.sfxVolume / 100);
  }, [settings.sfxVolume]);

  // Redimensionamento responsivo do Canvas (compatível com 16:9, Ultrawide 21:9, 32:9, tablets e mobile)
  const updateCanvasDimensions = useCallback(() => {
    if (!canvasRef.current) return;
    if (isPortfolioMode && gameState !== 'calibrating') {
      canvasRef.current.width = 1080;
      canvasRef.current.height = 1080;
      setCanvasDimensions({ width: 1080, height: 1080 });
    } else {
      const screenW = window.innerWidth;
      const screenH = window.innerHeight;

      canvasRef.current.width = screenW;
      canvasRef.current.height = screenH;
      setCanvasDimensions({ width: screenW, height: screenH });
    }

    if (canvasRef.current) {
      rendererRef.current = new CanvasRenderer(canvasRef.current);
    }
  }, [isPortfolioMode, gameState]);

  useEffect(() => {
    updateCanvasDimensions();
    window.addEventListener('resize', updateCanvasDimensions);
    return () => window.removeEventListener('resize', updateCanvasDimensions);
  }, [updateCanvasDimensions]);

  // Inicializa o fluxo de câmera
  const startCameraStream = async (deviceId?: string, preferFront: boolean = settings.isFrontCamera) => {
    setIsRequestingCamera(true);
    setCameraError(null);
    try {
      await cameraManagerRef.current.startCamera(deviceId, preferFront);
      setIsCameraActive(true);
      setCameraError(null);

      const cams = await cameraManagerRef.current.getAvailableCameras();
      setAvailableCameras(cams);

      // Carrega calibração anterior se existir para este dispositivo
      const isPortrait = window.innerHeight > window.innerWidth;
      const loadedProfile = CalibrationManager.loadProfile(
        cameraManagerRef.current.getCurrentDeviceId(),
        isPortrait
      );
      if (loadedProfile) {
        setProfile(loadedProfile);
        if (gameEngineRef.current) {
          gameEngineRef.current.setProfile(loadedProfile);
        }
        if (handTrackerRef.current) {
          handTrackerRef.current.setPreferredHand(loadedProfile.hand);
        }
      }
    } catch (err: any) {
      setCameraError(err.message || 'Erro ao inicializar câmera');
      setIsCameraActive(false);
    } finally {
      setIsRequestingCamera(false);
    }
  };

  // Pausa ao ocultar a aba do navegador
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && gameEngineRef.current && gameEngineRef.current.state === 'playing') {
        gameEngineRef.current.pauseMatch();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Atalho de Teclado: Barra de Espaço ativa o Super
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        if (gameEngineRef.current) {
          const activated = gameEngineRef.current.activateSuper();
          if (activated) {
            soundManagerRef.current.playSuperActivate();
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Loop Principal de Animação e Inferência
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const loop = (currentTime: number) => {
      const dt = Math.min((currentTime - lastTime) / 1000, 0.1);
      lastTime = currentTime;

      const video = cameraManagerRef.current.getVideoElement();
      const canvas = canvasRef.current;
      const engine = gameEngineRef.current;
      const renderer = rendererRef.current;
      const tracker = handTrackerRef.current;

      if (canvas && renderer && engine) {
        // Durante a calibração, o rastreamento e o canvas operam 100% em tela cheia (sem divisão de portfólio)
        const isCalibrating = gameStateRef.current === 'calibrating';
        const activePortfolio = isPortfolioModeRef.current && !isCalibrating;

        const gameW = canvas.width;
        const gameH = activePortfolio ? Math.round(canvas.height * 0.60) : canvas.height;

        // 1. Inferência MediaPipe (se no modo câmera, restrito à área de jogo ativa)
        if (settings.inputMode === 'camera' && tracker && video && video.readyState >= 2) {
          const handResult = tracker.processVideoFrame(
            video,
            canvas.width,
            canvas.height,
            settings.isFrontCamera,
            currentTime,
            0,
            0,
            gameW,
            gameH
          );

          if (handResult.detected && handResult.indexTip) {
            lastHandSeenTimeRef.current = currentTime;
            engine.handleBladeInput(
              handResult.indexTip.x,
              handResult.indexTip.y,
              handResult.isIndexExtended,
              currentTime
            );
          } else {
            // Só reseta o rastro se ficar sem detecção por mais de 160ms
            // Isso preserva golpes rápidos de uma ponta da tela a outra sem quebrar a lâmina
            if (currentTime - lastHandSeenTimeRef.current > 160) {
              engine.resetBlade();
            }
          }
        }

        // 2. Atualiza física e lógica do jogo dentro da área de jogo
        engine.update(dt, gameW, gameH, currentTime);
        setSuperTimeRemaining(engine.superTimeRemaining);

        // 3. Renderiza a composição do jogo no Canvas (durante a calibração, clareia a câmera para visualização nítida)
        const effectiveDarken = isCalibrating ? 8 : settings.darkenLevel;
        renderer.render(
          video,
          settings.isFrontCamera,
          effectiveDarken,
          settings.beautyLevel,
          engine.fruits,
          engine.bombs,
          engine.slicedHalves,
          engine.particles,
          engine.juiceSplatters,
          engine.floatingTexts,
          engine.bladePoints,
          latestHandOutputRef.current,
          settings.showSkeleton,
          engine.isSuperActive,
          currentTime,
          {
            isPortfolioMode: activePortfolio,
            isRecording,
            playerName,
            hud: {
              score,
              hearts,
              comboMultiplier: engine.getCurrentComboMultiplier(),
              remainingSeconds,
              level: currentLevel,
              superEnergy,
            },
          }
        );
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [
    gameState,
    settings.inputMode,
    settings.isFrontCamera,
    settings.darkenLevel,
    settings.beautyLevel,
    settings.showSkeleton,
    isPortfolioMode,
    playerName,
    score,
    hearts,
    remainingSeconds,
    currentLevel,
    superEnergy,
  ]);

  // Entrada de Mouse / Toque (Modo Acessibilidade)
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (settings.inputMode !== 'touch_mouse' || !canvasRef.current || !gameEngineRef.current) {
      return;
    }
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    const isCutting = e.buttons > 0 || e.pressure > 0;

    gameEngineRef.current.handleBladeInput(x, y, isCutting, performance.now());
  };

  // Início de Partida
  const enterCalibration = () => {
    setIsPortfolioMode(false);
    setGameState('calibrating');
  };

  const handleStartGame = (recordVideo: boolean, isPortfolio: boolean = false, name?: string) => {
    if (name) setPlayerName(name);

    if (!profile) {
      // Calibração obrigatória na primeira partida!
      // Durante a calibração, NUNCA ativa o modo portfolio - a tela deve ser 100% cheia e limpa!
      shouldRecordAfterCalibration.current = {
        record: recordVideo,
        isPortfolio,
        name: name || playerName,
      };
      enterCalibration();
      return;
    }

    launchMatch(recordVideo, isPortfolio, name || playerName);
  };

  const launchMatch = async (
    recordVideo: boolean,
    isPortfolio: boolean = isPortfolioMode,
    name: string = playerName
  ) => {
    if (!gameEngineRef.current || !canvasRef.current) return;

    // Garante que o AudioContext esteja ativo e despausado
    await soundManagerRef.current.ensureRunning();

    setIsPortfolioMode(isPortfolio);
    setPlayerName(name);
    gameEngineRef.current.startMatch(gameMode);
    setFinalStats(null);
    setRecordingResult(null);

    if (recordVideo) {
      const audioDest = settings.recordAudio ? soundManagerRef.current.getAudioDestinationNode() : null;
      recorderRef.current
        .startRecording(canvasRef.current, audioDest, settings.recordMic ?? false)
        .then(() => setIsRecording(true))
        .catch((err) => {
          console.warn('Gravação não pôde ser iniciada:', err);
          setIsRecording(false);
        });
    }
  };

  // Finalização da partida com buffer de 3 segundos na tela de resultado
  const handleMatchEnded = (stats: GameStats) => {
    stats.playerName = playerName;
    stats.isPortfolioMode = isPortfolioMode;
    setFinalStats(stats);

    if (recorderRef.current.isCurrentlyRecording()) {
      // Grava mais 3 segundos da tela de resultado antes de encerrar
      setTimeout(() => {
        recorderRef.current
          .stopRecording(stats.score)
          .then((res) => {
            setRecordingResult(res);
            setIsRecording(false);
          })
          .catch((err) => {
            console.error('Erro ao finalizar gravação:', err);
            setIsRecording(false);
          });
      }, 3000);
    }
  };

  // Alterna gravação durante o jogo
  const handleToggleRecording = async () => {
    if (!canvasRef.current) return;
    if (isRecording) {
      recorderRef.current.stopRecording(score).then((res) => {
        setRecordingResult(res);
        setIsRecording(false);
      });
    } else {
      await soundManagerRef.current.ensureRunning();
      const audioDest = settings.recordAudio ? soundManagerRef.current.getAudioDestinationNode() : null;
      recorderRef.current
        .startRecording(canvasRef.current, audioDest, settings.recordMic ?? false)
        .then(() => setIsRecording(true))
        .catch((err) => console.warn(err));
    }
  };

  return (
    <div className="relative w-full h-full overflow-hidden bg-slate-950 flex items-center justify-center">
      {/* Canvas do Jogo */}
      <canvas
        ref={canvasRef}
        onPointerMove={handlePointerMove}
        onPointerDown={handlePointerMove}
        className={
          isPortfolioMode && gameState !== 'calibrating'
            ? 'h-full max-h-screen aspect-square object-contain mx-auto touch-none shadow-2xl'
            : 'w-full h-full object-cover touch-none'
        }
      />

      {/* Tela Inicial */}
      {gameState === 'menu' && (
        <StartScreen
          currentMode={gameMode}
          onSelectMode={(mode) => setGameMode(mode)}
          onStartGame={handleStartGame}
          onRecalibrate={enterCalibration}
          onOpenSettings={() => setShowSettings(true)}
          isCameraActive={isCameraActive}
          onActivateCamera={() => startCameraStream()}
          hasCalibration={profile !== null}
          isMediaPipeReady={isMediaPipeReady}
          cameraError={cameraError}
          isRequestingCamera={isRequestingCamera}
        />
      )}

      {/* Assistente de Calibração */}
      {gameState === 'calibrating' && (
        <CalibrationWizard
          cameraDeviceId={cameraManagerRef.current.getCurrentDeviceId()}
          isFrontCamera={settings.isFrontCamera}
          isPortrait={window.innerHeight > window.innerWidth}
          canvasWidth={canvasDimensions.width}
          canvasHeight={canvasDimensions.height}
          currentFingerPos={currentFingerPos}
          isIndexExtended={isIndexExtended}
          onCalibrationComplete={(newProfile) => {
            setProfile(newProfile);
            if (gameEngineRef.current) {
              gameEngineRef.current.setProfile(newProfile);
            }
            if (handTrackerRef.current) {
              handTrackerRef.current.setPreferredHand(newProfile.hand);
            }
            // Se o jogador clicou em "Jogar", inicia a partida
            launchMatch(
              shouldRecordAfterCalibration.current.record,
              shouldRecordAfterCalibration.current.isPortfolio,
              shouldRecordAfterCalibration.current.name
            );
          }}
          onCancel={() => setGameState('menu')}
        />
      )}

      {/* HUD Durante a Partida */}
      {(gameState === 'playing' || gameState === 'paused' || gameState === 'countdown') && (
        <GameHUD
          score={score}
          hearts={hearts}
          maxHearts={5}
          remainingSeconds={remainingSeconds}
          maxSeconds={90}
          level={currentLevel}
          mode={gameMode}
          superEnergy={superEnergy}
          isSuperActive={isSuperActive}
          superTimeRemaining={superTimeRemaining}
          isRecording={isRecording}
          recordingDuration={recordingDuration}
          isHandDetected={isHandDetected}
          isIndexExtended={isIndexExtended}
          openPalmProgress={openPalmProgress}
          inputMode={settings.inputMode}
          isPortfolioMode={isPortfolioMode}
          isDamageProtected={
            gameEngineRef.current
              ? performance.now() < gameEngineRef.current.damageInvulnerabilityUntil
              : false
          }
          onActivateSuper={() => {
            if (gameEngineRef.current) {
              const ok = gameEngineRef.current.activateSuper();
              if (ok) soundManagerRef.current.playSuperActivate();
            }
          }}
          onPause={() => {
            if (gameEngineRef.current) gameEngineRef.current.pauseMatch();
          }}
          onRecalibrate={() => {
            if (gameEngineRef.current) gameEngineRef.current.pauseMatch();
            enterCalibration();
          }}
          onToggleRecording={handleToggleRecording}
        />
      )}

      {/* Contagem Regressiva para Retomar (3, 2, 1) */}
      {gameState === 'countdown' && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-[#08090d]/70 backdrop-blur-sm pointer-events-none select-none">
          <span className="text-8xl font-black font-ninja text-amber-400 drop-shadow-[0_0_35px_#ea580c] animate-ping">
            {gameEngineRef.current?.countdownNumber || 3}
          </span>
        </div>
      )}

      {/* Modal de Pausa */}
      {gameState === 'paused' && (
        <PauseModal
          score={score}
          hearts={hearts}
          remainingSeconds={remainingSeconds}
          onResume={() => {
            if (gameEngineRef.current) {
              gameEngineRef.current.resumeMatchWithCountdown(() => {
                soundManagerRef.current.playCountdown(0);
              });
            }
          }}
          onRecalibrate={enterCalibration}
          onOpenSettings={() => setShowSettings(true)}
          onExit={() => setGameState('menu')}
        />
      )}

      {/* Modal de Fim de Partida com Resultados & Vídeo */}
      {gameState === 'gameover' && finalStats && (
        <GameOverModal
          stats={finalStats}
          recordingResult={recordingResult}
          onPlayAgain={() => launchMatch(false)}
          onChangeDifficulty={() => setGameState('menu')}
          onRecalibrate={enterCalibration}
        />
      )}

      {/* Modal de Configurações */}
      {showSettings && (
        <SettingsModal
          settings={settings}
          availableCameras={availableCameras}
          onUpdateSettings={(newVals) => {
            setSettings((prev) => {
              const updated = { ...prev, ...newVals };
              if (newVals.cameraDeviceId && newVals.cameraDeviceId !== prev.cameraDeviceId) {
                startCameraStream(newVals.cameraDeviceId, updated.isFrontCamera);
              }
              if (newVals.isFrontCamera !== undefined && newVals.isFrontCamera !== prev.isFrontCamera) {
                startCameraStream(updated.cameraDeviceId, newVals.isFrontCamera);
              }
              return updated;
            });
          }}
          onRecalibrate={() => {
            setShowSettings(false);
            enterCalibration();
          }}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
};
