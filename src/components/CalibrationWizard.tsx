import React, { useState, useEffect, useRef, useMemo } from 'react';
import { CheckCircle2, AlertTriangle, ArrowRight, Hand, Sparkles, RefreshCw } from 'lucide-react';
import { CalibrationProfile, Fruit } from '../types/game';
import { CalibrationManager } from '../tracking/calibrationManager';
import { SliceableButton } from './SliceableButton';

interface CalibrationWizardProps {
  cameraDeviceId: string;
  isFrontCamera: boolean;
  isPortrait: boolean;
  canvasWidth: number;
  canvasHeight: number;
  currentFingerPos: { x: number; y: number } | null;
  isIndexExtended: boolean;
  onCalibrationComplete: (profile: CalibrationProfile) => void;
  onCancel?: () => void;
}

type WizardStep = 'intro' | 'hand_choice' | 'center_target' | 'reach_targets' | 'slash_test' | 'practice' | 'result';

export const CalibrationWizard: React.FC<CalibrationWizardProps> = ({
  cameraDeviceId,
  isFrontCamera,
  isPortrait,
  canvasWidth,
  canvasHeight,
  currentFingerPos,
  isIndexExtended,
  onCalibrationComplete,
  onCancel,
}) => {
  const [step, setStep] = useState<WizardStep>('intro');
  const [selectedHand, setSelectedHand] = useState<'Left' | 'Right'>('Right');

  // Step 3: Center hold (1 second)
  const [centerHoldProgress, setCenterHoldProgress] = useState<number>(0);
  const centerHoldStartRef = useRef<number | null>(null);
  const centerPositionsRef = useRef<Array<{ x: number; y: number }>>([]);

  // Step 4: 4 Reach targets
  const [reachIndex, setReachIndex] = useState<number>(0);
  const [reachHoldProgress, setReachHoldProgress] = useState<number>(0);
  const reachHoldRef = useRef<number | null>(null);
  const reachCollectedPointsRef = useRef<Array<{ x: number; y: number }>>([]);

  // Step 5: 3 Slashes test
  const [slashesDone, setSlashesDone] = useState<number>(0);
  const slashSpeedsRef = useRef<number[]>([]);
  const lastPosRef = useRef<{ x: number; y: number; time: number } | null>(null);

  // Step 6: Practice test round (3 fruits)
  const [practiceCuts, setPracticeCuts] = useState<number>(0);

  // Quality result
  const [quality, setQuality] = useState<'Boa' | 'Regular' | 'Precisa ajustar'>('Boa');
  const [feedbackMessages, setFeedbackMessages] = useState<string[]>([]);

  // Posições dos alvos de alcance adaptáveis a qualquer formato de tela (16:9, Ultrawide 21:9 / 32:9 ou Portrait)
  const targets = useMemo(() => {
    const aspectRatio = canvasWidth > 0 && canvasHeight > 0 ? canvasWidth / canvasHeight : 16 / 9;
    // Centralizamos o span horizontal para caber com folga no alcance natural dos braços em frente à câmera
    const normSpanX = Math.min(0.18, (0.18 * 1.777) / Math.max(1.0, aspectRatio));
    const xLeft = Math.round((0.5 - normSpanX) * 1000) / 1000;
    const xRight = Math.round((0.5 + normSpanX) * 1000) / 1000;
    const yTop = 0.35;
    const yBottom = 0.65;

    return [
      { name: 'Superior Esquerdo', x: xLeft, y: yTop },
      { name: 'Superior Direito', x: xRight, y: yTop },
      { name: 'Inferior Esquerdo', x: xLeft, y: yBottom },
      { name: 'Inferior Direito', x: xRight, y: yBottom },
    ];
  }, [canvasWidth, canvasHeight]);

  // 1. Passo: Manter no centro por 1 segundo
  useEffect(() => {
    if (step !== 'center_target') return;

    const centerX = canvasWidth * 0.5;
    const centerY = canvasHeight * 0.5;
    const radius = Math.max(90, Math.min(canvasWidth, canvasHeight) * 0.12);

    let animId: number;

    const checkHold = () => {
      const now = performance.now();
      if (currentFingerPos && isIndexExtended) {
        const dist = Math.hypot(currentFingerPos.x - centerX, currentFingerPos.y - centerY);
        if (dist <= radius) {
          centerPositionsRef.current.push(currentFingerPos);
          if (centerHoldStartRef.current === null) {
            centerHoldStartRef.current = now;
          }
          const elapsed = now - centerHoldStartRef.current;
          const progress = Math.min(1.0, elapsed / 1000); // 1 segundo
          setCenterHoldProgress(progress);

          if (progress >= 1.0) {
            setStep('reach_targets');
            return;
          }
        } else {
          centerHoldStartRef.current = null;
          setCenterHoldProgress(0);
        }
      } else {
        centerHoldStartRef.current = null;
        setCenterHoldProgress(0);
      }

      animId = requestAnimationFrame(checkHold);
    };

    animId = requestAnimationFrame(checkHold);
    return () => cancelAnimationFrame(animId);
  }, [step, currentFingerPos, isIndexExtended, canvasWidth, canvasHeight]);

  const advanceReachTarget = (x?: number, y?: number) => {
    const currentT = targets[reachIndex];
    const pt = {
      x: x ?? (currentT ? currentT.x * canvasWidth : canvasWidth * 0.5),
      y: y ?? (currentT ? currentT.y * canvasHeight : canvasHeight * 0.5),
    };
    reachCollectedPointsRef.current.push(pt);
    reachHoldRef.current = null;
    setReachHoldProgress(0);

    if (reachIndex < targets.length - 1) {
      setReachIndex((prev) => prev + 1);
    } else {
      setStep('slash_test');
    }
  };

  // 2. Passo: Alvos de alcance (4 cantos)
  useEffect(() => {
    if (step !== 'reach_targets') return;

    const currentT = targets[reachIndex];
    if (!currentT) return;

    const tx = currentT.x * canvasWidth;
    const ty = currentT.y * canvasHeight;
    const radius = Math.max(120, Math.min(canvasWidth, canvasHeight) * 0.15);

    let animId: number;

    const checkReach = () => {
      const now = performance.now();
      if (currentFingerPos && isIndexExtended) {
        const dist = Math.hypot(currentFingerPos.x - tx, currentFingerPos.y - ty);
        if (dist <= radius) {
          if (reachHoldRef.current === null) {
            reachHoldRef.current = now;
          }
          const elapsed = now - reachHoldRef.current;
          const progress = Math.min(1.0, elapsed / 350); // 350ms para capturar alcance
          setReachHoldProgress(progress);

          if (progress >= 1.0) {
            advanceReachTarget(currentFingerPos.x, currentFingerPos.y);
            return;
          }
        } else {
          reachHoldRef.current = null;
          setReachHoldProgress(0);
        }
      } else {
        reachHoldRef.current = null;
        setReachHoldProgress(0);
      }

      animId = requestAnimationFrame(checkReach);
    };

    animId = requestAnimationFrame(checkReach);
    return () => cancelAnimationFrame(animId);
  }, [step, reachIndex, currentFingerPos, isIndexExtended, canvasWidth, canvasHeight]);

  // 3. Passo: 3 Cortes em direções diferentes
  useEffect(() => {
    if (step !== 'slash_test') return;

    const now = performance.now();
    if (currentFingerPos && isIndexExtended) {
      if (lastPosRef.current) {
        const dt = (now - lastPosRef.current.time) / 1000;
        if (dt > 0.015 && dt < 0.25) {
          const dist = Math.hypot(currentFingerPos.x - lastPosRef.current.x, currentFingerPos.y - lastPosRef.current.y);
          const speed = dist / dt; // px/s

          // Se for um golpe rápido (> 450 px/s)
          if (speed > 450) {
            slashSpeedsRef.current.push(speed);
            const count = slashesDone + 1;
            setSlashesDone(count);
            lastPosRef.current = null; // reseta para próximo golpe

            if (count >= 3) {
              setStep('practice');
            }
            return;
          }
        }
      }
      lastPosRef.current = { x: currentFingerPos.x, y: currentFingerPos.y, time: now };
    }
  }, [step, currentFingerPos, isIndexExtended, slashesDone]);

  // 4. Finalização da calibração e cálculo de qualidade
  const finalizeCalibration = () => {
    // Calcula jitter no teste central
    let jitter = 15;
    if (centerPositionsRef.current.length > 5) {
      const avgX = centerPositionsRef.current.reduce((a, b) => a + b.x, 0) / centerPositionsRef.current.length;
      const avgY = centerPositionsRef.current.reduce((a, b) => a + b.y, 0) / centerPositionsRef.current.length;
      jitter = centerPositionsRef.current.reduce((acc, p) => acc + Math.hypot(p.x - avgX, p.y - avgY), 0) / centerPositionsRef.current.length;
    }

    // Calcula área de alcance segura
    let minX = 0.15;
    let maxX = 0.85;
    let minY = 0.15;
    let maxY = 0.85;

    if (reachCollectedPointsRef.current.length >= 4) {
      const xs = reachCollectedPointsRef.current.map((p) => p.x / canvasWidth);
      const ys = reachCollectedPointsRef.current.map((p) => p.y / canvasHeight);
      minX = Math.max(0.08, Math.min(...xs) - 0.05);
      maxX = Math.min(0.92, Math.max(...xs) + 0.05);
      minY = Math.max(0.1, Math.min(...ys) - 0.05);
      maxY = Math.min(0.88, Math.max(...ys) + 0.05);
    }

    // Média de velocidade de corte
    const avgSlash = slashSpeedsRef.current.length > 0
      ? slashSpeedsRef.current.reduce((a, b) => a + b, 0) / slashSpeedsRef.current.length
      : 300;

    const reachRatio = (maxX - minX) * (maxY - minY);
    const { quality: computedQuality, feedback } = CalibrationManager.evaluateQuality(
      jitter,
      reachRatio,
      avgSlash / 1000,
      0.9
    );

    setQuality(computedQuality);
    setFeedbackMessages(feedback);

    const profile: CalibrationProfile = {
      hand: selectedHand,
      centerPoint: { x: 0.5, y: 0.5 },
      safeZone: { minX, maxX, minY, maxY },
      minCutSpeed: Math.max(180, avgSlash * 0.4), // corte precisa de pelo menos 40% da velocidade calibrada
      reachDistance: Math.hypot(maxX - minX, maxY - minY),
      quality: computedQuality,
      cameraDeviceId,
      isFrontCamera,
      isPortrait,
      calibratedAt: Date.now(),
    };

    CalibrationManager.saveProfile(profile);
    setStep('result');
  };

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center p-4 select-none overflow-hidden">
      {/* Camada sutil para realçar a visão da webcam ao vivo e das mãos durante a calibração */}
      <div className="absolute inset-0 bg-slate-950/20 backdrop-blur-[0.5px] pointer-events-none" />

      {/* Alvo Físico de Alcance Confortável (renderizado nas coordenadas reais dos 4 cantos) */}
      {step === 'reach_targets' && targets[reachIndex] && (
        <div
          onClick={() => advanceReachTarget()}
          className="absolute -translate-x-1/2 -translate-y-1/2 z-40 cursor-pointer pointer-events-auto transition-all duration-300 group"
          style={{
            left: `${targets[reachIndex].x * 100}%`,
            top: `${targets[reachIndex].y * 100}%`,
          }}
        >
          <div className="relative flex items-center justify-center w-36 h-36">
            {/* Onda pulsante externa de Chakra */}
            <div className="absolute inset-0 rounded-full border-4 border-amber-400 animate-ping opacity-75 shadow-[0_0_35px_#f97316]" />

            {/* Anel giratório ninja */}
            <div
              className="absolute inset-1 rounded-full border-2 border-dashed border-orange-400 animate-spin"
              style={{ animationDuration: '4s' }}
            />

            {/* Fundo do alvo com progresso de preenchimento */}
            <div className="relative w-28 h-28 rounded-full bg-[#0a0f1d]/95 border-4 border-amber-400 flex flex-col items-center justify-center shadow-[0_0_30px_rgba(245,158,11,0.7)] backdrop-blur-md overflow-hidden">
              <div
                className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-orange-500 via-amber-400 to-yellow-300 opacity-90 transition-all duration-75"
                style={{ height: `${reachHoldProgress * 100}%` }}
              />
              <span className="relative z-10 text-[10px] font-bold text-amber-200 uppercase tracking-wider font-ninja">
                Alvo {reachIndex + 1}/4
              </span>
              <span className="relative z-10 text-xs font-black text-white font-ninja drop-shadow-[0_1px_3px_black]">
                {reachHoldProgress > 0 ? `${Math.round(reachHoldProgress * 100)}%` : 'TOQUE AQUI'}
              </span>
            </div>

            {/* Linhas de mira cruzadas */}
            <div className="absolute w-full h-[2px] bg-amber-400/60 pointer-events-none" />
            <div className="absolute h-full w-[2px] bg-amber-400/60 pointer-events-none" />
          </div>
        </div>
      )}

      {/* Card Principal de Calibração Shinobi */}
      <div className="relative z-10 w-full max-w-lg bg-[#0f131f]/94 backdrop-blur-xl border border-orange-500/50 rounded-3xl p-6 shadow-[0_0_60px_rgba(0,0,0,0.9)] text-[#fffdf5] flex flex-col items-center text-center my-auto ring-1 ring-amber-400/30">
        {/* Step: Intro */}
        {step === 'intro' && (
          <div className="flex flex-col items-center gap-3">
            <div className="relative my-1 flex items-center justify-center">
              <div className="absolute -inset-1 rounded-full border-2 border-amber-400/70 shadow-[0_0_25px_#f97316] animate-pulse pointer-events-none" />
              <img
                src="/mascot.jpg"
                alt="Mascote Shinobi"
                className="w-24 h-24 rounded-full object-cover border-4 border-orange-500 relative z-10"
              />
            </div>
            <h2 className="text-2xl sm:text-3xl font-black font-ninja text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-amber-300 to-red-500 drop-shadow-[0_0_18px_#ea580c] tracking-wider">
              Calibração Shinobi
            </h2>
            <p className="text-xs text-amber-200/90 leading-relaxed max-w-sm">
              Para empunhar sua katana com precisão e velocidade, faremos um alinhamento rápido de 15 segundos:
            </p>
            <ul className="text-xs text-amber-100/90 space-y-2 text-left bg-[#151928]/90 p-4 rounded-2xl border border-orange-500/30 w-full shadow-inner">
              <li>• Apoie o dispositivo de forma estável.</li>
              <li>• Posicione-se em local iluminado, com as mãos livres.</li>
              <li>• Mantenha o dedo indicador bem visível para a câmera.</li>
            </ul>
            <SliceableButton
              onSlice={() => setStep('hand_choice')}
              currentFingerPos={currentFingerPos}
              isIndexExtended={isIndexExtended}
              className="mt-2 flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-orange-500 via-amber-500 to-red-600 hover:from-orange-400 hover:to-red-500 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.7)] font-black font-ninja rounded-2xl transition-all shadow-lg shadow-orange-500/30 active:scale-95 cursor-pointer text-sm tracking-wider"
            >
              <span>INICIAR TREINO</span>
              <ArrowRight className="w-4 h-4 text-white" />
            </SliceableButton>
          </div>
        )}

        {/* Step: Hand Choice */}
        {step === 'hand_choice' && (
          <div className="flex flex-col items-center gap-4">
            <h2 className="text-xl sm:text-2xl font-black font-ninja text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-amber-300 to-red-500 drop-shadow-[0_0_16px_#ea580c]">
              Mão da Katana
            </h2>
            <p className="text-xs text-amber-200/90">
              Qual mão você usará para golpear e fatiar com a lâmina shinobi?
            </p>
            <div className="flex gap-4 my-2">
              <button
                onClick={() => setSelectedHand('Right')}
                className={`px-6 py-4 rounded-2xl border flex flex-col items-center gap-2 cursor-pointer transition-all ${
                  selectedHand === 'Right'
                    ? 'bg-orange-500/25 border-orange-400 text-orange-200 shadow-[0_0_20px_rgba(249,115,22,0.4)]'
                    : 'bg-[#151928] border-slate-700/80 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Hand className="w-8 h-8 text-orange-400" />
                <span className="font-bold font-ninja text-xs">Mão Direita</span>
              </button>
              <button
                onClick={() => setSelectedHand('Left')}
                className={`px-6 py-4 rounded-2xl border flex flex-col items-center gap-2 cursor-pointer transition-all ${
                  selectedHand === 'Left'
                    ? 'bg-orange-500/25 border-orange-400 text-orange-200 shadow-[0_0_20px_rgba(249,115,22,0.4)]'
                    : 'bg-[#151928] border-slate-700/80 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Hand className="w-8 h-8 scale-x-[-1] text-orange-400" />
                <span className="font-bold font-ninja text-xs">Mão Esquerda</span>
              </button>
            </div>
            <SliceableButton
              onSlice={() => setStep('center_target')}
              currentFingerPos={currentFingerPos}
              isIndexExtended={isIndexExtended}
              className="flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-orange-500 via-amber-500 to-red-600 hover:from-orange-400 hover:to-red-500 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.7)] font-black font-ninja rounded-2xl transition-all shadow-lg shadow-orange-500/30 active:scale-95 cursor-pointer text-sm"
            >
              <span>CONFIRMAR MÃO</span>
              <ArrowRight className="w-4 h-4 text-white" />
            </SliceableButton>
          </div>
        )}

        {/* Step: Center Target */}
        {step === 'center_target' && (
          <div className="flex flex-col items-center gap-3">
            <h2 className="text-xl sm:text-2xl font-black font-ninja text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-amber-300 to-red-500 drop-shadow-[0_0_16px_#ea580c]">
              Estabilidade do Chakra
            </h2>
            <p className="text-xs text-amber-200/90">
              Aponte o indicador e mantenha a ponta sobre o alvo central por 1 segundo:
            </p>
            <div className="relative w-32 h-32 flex items-center justify-center border-2 border-dashed border-orange-400 rounded-full my-3 animate-pulse">
              <div
                className="absolute inset-0 rounded-full bg-orange-500/35 transition-all duration-75"
                style={{ transform: `scale(${centerHoldProgress})` }}
              />
              <span className="font-black text-2xl font-ninja text-amber-300">
                {Math.round(centerHoldProgress * 100)}%
              </span>
            </div>
            <span className="text-xs text-amber-300/80">
              {isIndexExtended ? '✓ Indicador estendido detectado' : 'Estenda apenas o dedo indicador'}
            </span>
          </div>
        )}

        {/* Step: Reach Targets */}
        {step === 'reach_targets' && (
          <div className="flex flex-col items-center gap-3">
            <h2 className="text-xl sm:text-2xl font-black font-ninja text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-amber-300 to-red-500 drop-shadow-[0_0_16px_#ea580c]">
              Alcance Confortável
            </h2>
            <p className="text-xs text-amber-200/90">
              Toque no alvo <b>{targets[reachIndex]?.name}</b> ({reachIndex + 1}/4) com o indicador:
            </p>
            <div className="w-full flex justify-center gap-2.5 my-2">
              {targets.map((_, i) => (
                <div
                  key={i}
                  className={`w-4 h-4 rounded-full transition-all ${
                    i < reachIndex
                      ? 'bg-emerald-400 shadow-[0_0_8px_#22c55e]'
                      : i === reachIndex
                      ? 'bg-amber-400 animate-ping shadow-[0_0_12px_#f59e0b]'
                      : 'bg-slate-700/80'
                  }`}
                />
              ))}
            </div>
            <span className="text-xs text-amber-200/70">
              Aponte o indicador para o alvo shinobi que está brilhando no canto da tela (ou clique nele).
            </span>
            <SliceableButton
              onSlice={() => advanceReachTarget()}
              respawnAfterMs={300}
              currentFingerPos={currentFingerPos}
              isIndexExtended={isIndexExtended}
              className="mt-2 px-5 py-2 rounded-xl bg-orange-500/20 hover:bg-orange-500/35 border border-orange-500/50 text-xs text-amber-300 font-bold font-ninja cursor-pointer transition-all active:scale-95"
            >
              <span>Confirmar / Pular este Alvo →</span>
            </SliceableButton>
          </div>
        )}

        {/* Step: Slash Test */}
        {step === 'slash_test' && (
          <div className="flex flex-col items-center gap-3">
            <h2 className="text-xl sm:text-2xl font-black font-ninja text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-amber-300 to-red-500 drop-shadow-[0_0_16px_#ea580c]">
              Velocidade da Katana
            </h2>
            <p className="text-xs text-amber-200/90">
              Faça <b>3 golpes rápidos de corte</b> na tela em direções diferentes:
            </p>
            <div className="flex gap-4 my-3">
              {[1, 2, 3].map((num) => (
                <div
                  key={num}
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black font-ninja text-xl border transition-all ${
                    slashesDone >= num
                      ? 'bg-emerald-500/25 border-emerald-400 text-emerald-300 shadow-[0_0_15px_#22c55e]'
                      : 'bg-[#151928] border-orange-500/30 text-slate-500'
                  }`}
                >
                  {slashesDone >= num ? '✓' : num}
                </div>
              ))}
            </div>
            <span className="text-xs text-amber-200/70">Golpeie com vigor como se estivesse fatiando no ar</span>
          </div>
        )}

        {/* Step: Practice Round */}
        {step === 'practice' && (
          <div className="flex flex-col items-center gap-4">
            <div className="p-3 bg-orange-500/20 rounded-2xl border border-orange-400">
              <Sparkles className="w-10 h-10 text-orange-400" />
            </div>
            <h2 className="text-xl sm:text-2xl font-black font-ninja text-amber-300 drop-shadow-[0_0_16px_#ea580c]">
              Treino da Katana
            </h2>
            <p className="text-xs text-amber-200/90">
              Pronto para o último teste! Corte frutas sem perigo de bombas ou perda de vidas:
            </p>
            <div className="flex items-center gap-2 text-sm bg-[#171c2b] px-4 py-2 rounded-xl border border-orange-500/30">
              <span className="text-amber-200/80">Frutas cortadas:</span>
              <span className="font-bold text-amber-400 font-ninja">{practiceCuts}</span>
            </div>
            <div className="flex items-center gap-3">
              <SliceableButton
                onSlice={() => setPracticeCuts((c) => c + 1)}
                respawnAfterMs={350}
                currentFingerPos={currentFingerPos}
                isIndexExtended={isIndexExtended}
                className="px-4 py-2.5 bg-[#171c2b] hover:bg-[#20273c] text-amber-200 text-xs rounded-xl border border-orange-500/40 font-bold flex items-center justify-center cursor-pointer shadow-md"
              >
                +1 Simular Corte
              </SliceableButton>

              <SliceableButton
                onSlice={finalizeCalibration}
                currentFingerPos={currentFingerPos}
                isIndexExtended={isIndexExtended}
                className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-orange-500 via-amber-500 to-red-600 hover:from-orange-400 hover:to-red-500 text-white font-bold font-ninja rounded-xl shadow-lg drop-shadow cursor-pointer"
              >
                <span>Concluir Treino</span>
                <CheckCircle2 className="w-5 h-5 text-white" />
              </SliceableButton>
            </div>
          </div>
        )}

        {/* Step: Result & Quality Feedback */}
        {step === 'result' && (
          <div className="flex flex-col items-center gap-4">
            <div
              className={`p-3 rounded-2xl border ${
                quality === 'Boa'
                  ? 'bg-emerald-500/20 border-emerald-400 text-emerald-400 shadow-[0_0_15px_#22c55e]'
                  : quality === 'Regular'
                  ? 'bg-amber-500/20 border-amber-400 text-amber-400 shadow-[0_0_15px_#f59e0b]'
                  : 'bg-red-500/20 border-red-400 text-red-400 shadow-[0_0_15px_#ef4444]'
              }`}
            >
              {quality === 'Precisa ajustar' ? (
                <AlertTriangle className="w-10 h-10" />
              ) : (
                <CheckCircle2 className="w-10 h-10" />
              )}
            </div>
            <h2 className="text-2xl font-black font-ninja text-white">
              Qualidade: <span className={quality === 'Boa' ? 'text-emerald-400' : quality === 'Regular' ? 'text-amber-400' : 'text-red-400'}>{quality}</span>
            </h2>

            {feedbackMessages.length > 0 ? (
              <div className="bg-[#171c2b] p-3 rounded-xl border border-orange-500/30 text-xs text-amber-100/90 text-left space-y-1 w-full">
                {feedbackMessages.map((msg, i) => (
                  <p key={i}>• {msg}</p>
                ))}
              </div>
            ) : (
              <p className="text-xs text-emerald-300 font-bold">Calibração perfeita! A lâmina e a área de alcance shinobi foram configuradas com sucesso.</p>
            )}

            <div className="flex gap-3 mt-2 w-full justify-center">
              {quality === 'Precisa ajustar' && (
                <button
                  onClick={() => {
                    setStep('center_target');
                    setCenterHoldProgress(0);
                    setReachIndex(0);
                    setSlashesDone(0);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-[#171c2b] hover:bg-[#20273c] border border-orange-500/30 rounded-xl text-xs font-bold text-white cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4 text-orange-400" />
                  <span>Repetir</span>
                </button>
              )}
              <SliceableButton
                onSlice={() => {
                  const stored = CalibrationManager.loadProfile(cameraDeviceId, isPortrait);
                  if (stored) {
                    onCalibrationComplete(stored);
                  }
                }}
                currentFingerPos={currentFingerPos}
                isIndexExtended={isIndexExtended}
                className="flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-orange-500 via-amber-500 to-red-600 hover:from-orange-400 hover:to-red-500 text-white font-black font-ninja rounded-2xl shadow-lg shadow-orange-500/30 active:scale-95 cursor-pointer text-sm drop-shadow-[0_2px_4px_rgba(0,0,0,0.7)]"
              >
                <span>ENTRAR NO JOGO</span>
                <CheckCircle2 className="w-5 h-5 text-white" />
              </SliceableButton>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
