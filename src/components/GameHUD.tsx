import React from 'react';
import { Heart, Pause, Zap, Disc3, RefreshCw } from 'lucide-react';
import { GameMode } from '../types/game';

interface GameHUDProps {
  score: number;
  hearts: number;
  maxHearts: number;
  remainingSeconds: number;
  maxSeconds: number;
  level: number;
  mode: GameMode;
  superEnergy: number;
  isSuperActive: boolean;
  superTimeRemaining: number;
  isRecording: boolean;
  recordingDuration: number;
  isHandDetected: boolean;
  isIndexExtended: boolean;
  openPalmProgress: number;
  inputMode: 'camera' | 'touch_mouse';
  isDamageProtected: boolean;
  isPortfolioMode?: boolean;
  onActivateSuper: () => void;
  onPause: () => void;
  onRecalibrate: () => void;
  onToggleRecording: () => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  score,
  hearts,
  maxHearts,
  remainingSeconds,
  maxSeconds,
  level,
  mode,
  superEnergy,
  isSuperActive,
  superTimeRemaining,
  isRecording,
  recordingDuration,
  isHandDetected,
  isIndexExtended,
  openPalmProgress,
  inputMode,
  isDamageProtected,
  isPortfolioMode = false,
  onActivateSuper,
  onPause,
  onRecalibrate,
  onToggleRecording,
}) => {
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const modeLabel = {
    iniciante: 'Genin',
    normal: 'Chunin',
    desafio: 'Jonin',
  }[mode];

  return (
    <div
      className={`absolute left-0 right-0 pointer-events-none flex flex-col justify-between p-4 z-20 select-none ${
        isPortfolioMode ? 'top-0 h-[60%]' : 'inset-0'
      }`}
    >
      {/* Top Bar */}
      <div className="flex items-center justify-between w-full">
        {/* Left: Score & Multiplier */}
        <div className="flex flex-col items-start gap-1">
          <div className="flex items-center gap-2 bg-[#0d101c]/90 backdrop-blur-md px-4 py-2 rounded-2xl border border-orange-500/50 shadow-lg shadow-orange-500/20">
            <span className="text-xs uppercase tracking-wider text-orange-400 font-bold">Pontos</span>
            <span className="text-2xl sm:text-3xl font-black font-ninja text-amber-300 tracking-wider drop-shadow-[0_0_12px_#f59e0b]">
              {score}
            </span>
          </div>

          {/* Level and Mode badges */}
          <div className="flex items-center gap-2 ml-1">
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 font-semibold uppercase">
              Nível {level}
            </span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#171c2b] border border-orange-500/30 text-amber-200 font-medium">
              {modeLabel}
            </span>
          </div>
        </div>

        {/* Center: Match Timer */}
        <div className="flex flex-col items-center">
          <div
            className={`flex items-center gap-2 px-5 py-2 rounded-2xl border backdrop-blur-md shadow-lg transition-colors ${
              remainingSeconds <= 15
                ? 'bg-red-950/80 border-red-500 text-red-300 animate-pulse'
                : 'bg-[#0d101c]/90 border-amber-500/40 text-amber-100'
            }`}
          >
            <span className="text-xs uppercase tracking-wider text-amber-400/80 font-bold">Tempo</span>
            <span className="text-2xl font-black font-ninja tracking-wider">
              {formatTime(remainingSeconds)}
            </span>
          </div>
          {/* Circular/Linear progress indicator */}
          <div className="w-32 h-1.5 bg-slate-900 rounded-full mt-1.5 overflow-hidden border border-orange-500/30">
            <div
              className={`h-full transition-all duration-300 ${
                remainingSeconds <= 15 ? 'bg-red-500' : 'bg-orange-500'
              }`}
              style={{ width: `${(remainingSeconds / maxSeconds) * 100}%` }}
            />
          </div>
        </div>

        {/* Right: Hearts & Pause */}
        <div className="flex items-center gap-3">
          {/* Hearts / Vidas Uchiha */}
          <div
            className={`flex items-center gap-1.5 bg-[#0d101c]/90 backdrop-blur-md px-3.5 py-2 rounded-2xl border ${
              isDamageProtected ? 'border-red-500 animate-pulse bg-red-950/60' : 'border-red-600/50'
            }`}
          >
            {Array.from({ length: maxHearts }).map((_, idx) => (
              <Heart
                key={idx}
                className={`w-6 h-6 transition-all duration-200 ${
                  idx < hearts
                    ? 'text-red-500 fill-red-500 filter drop-shadow-[0_0_8px_#dc2626]'
                    : 'text-slate-700/60'
                }`}
              />
            ))}
          </div>

          {/* Pause Button (protegido contra toques acidentais durante cortes) */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPause();
            }}
            onPointerDown={(e) => e.stopPropagation()}
            onPointerMove={(e) => e.stopPropagation()}
            className="pointer-events-auto p-2.5 rounded-2xl bg-[#171c2b]/95 hover:bg-[#20273c] active:scale-90 border border-orange-500/40 text-amber-200 backdrop-blur-md transition-all shadow-lg cursor-pointer select-none"
            title="Pausar o treino"
          >
            <Pause className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Middle Alerts / Gestures Feedback */}
      <div className="flex flex-col items-center gap-2">
        {/* Palm Open progress charging indicator */}
        {openPalmProgress > 0 && (
          <div className="flex flex-col items-center gap-1 bg-[#0d101c]/95 border border-orange-500 px-5 py-2.5 rounded-2xl backdrop-blur-md animate-pulse shadow-[0_0_20px_#ea580c]">
            <span className="text-xs uppercase font-bold text-amber-300 font-ninja">Concentrando Chakra...</span>
            <div className="w-36 h-2 bg-slate-900 rounded-full overflow-hidden border border-orange-500/40">
              <div
                className="h-full bg-gradient-to-r from-amber-400 via-orange-500 to-red-600 transition-all duration-75"
                style={{ width: `${openPalmProgress * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Bottom Bar */}
      <div className="flex items-end justify-between w-full">
        {/* Left: Tracking & Recording Status */}
        <div className="flex flex-col gap-2">
          {/* Tracking indicator */}
          <div className="flex items-center gap-2 bg-[#0d101c]/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700/80 text-xs">
            {inputMode === 'camera' ? (
              <>
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    isHandDetected
                      ? isIndexExtended
                        ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
                        : 'bg-amber-400 shadow-[0_0_8px_#fbbf24]'
                      : 'bg-red-500 animate-ping'
                  }`}
                />
                <span className="text-amber-100/90 font-medium">
                  {isHandDetected
                    ? isIndexExtended
                      ? 'Katana Pronta'
                      : 'Lâmina Embainhada'
                    : 'Aponte o indicador'}
                </span>
              </>
            ) : (
              <span className="text-amber-300 font-medium">Modo Mouse / Toque</span>
            )}
          </div>

          {/* Recording indicator & quick toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={onToggleRecording}
              className={`pointer-events-auto flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold backdrop-blur-md border transition-all active:scale-95 ${
                isRecording
                  ? 'bg-red-950/80 border-red-500 text-red-300 animate-pulse'
                  : 'bg-[#0d101c]/90 border-slate-700 text-slate-300 hover:text-white'
              }`}
            >
              <Disc3 className={`w-4 h-4 ${isRecording ? 'text-red-500 animate-spin' : ''}`} />
              <span>{isRecording ? `REC ${formatTime(recordingDuration)}` : 'Gravar'}</span>
            </button>

            {/* Recalibrate button during match (pauses and preserves state!) */}
            <button
              onClick={onRecalibrate}
              className="pointer-events-auto flex items-center gap-1.5 bg-[#0d101c]/90 hover:bg-[#1a2034] border border-orange-500/30 px-3 py-1.5 rounded-xl text-xs text-amber-200/90 hover:text-white backdrop-blur-md transition-all active:scale-95"
              title="Recalibrar agora (pausa o treino)"
            >
              <RefreshCw className="w-3.5 h-3.5 text-orange-400" />
              <span>Recalibrar</span>
            </button>
          </div>
        </div>

        {/* Center / Right: Super Ability Energy Bar */}
        <div className="flex flex-col items-end gap-1.5">
          <div className="flex items-center gap-2">
            {isSuperActive ? (
              <span className="text-xs uppercase font-bold text-orange-400 font-ninja animate-bounce">
                CHAKRA LIBERADO ({superTimeRemaining.toFixed(1)}s)
              </span>
            ) : (
              <span className="text-xs uppercase font-bold text-amber-200/80 font-ninja">
                Chakra {superEnergy}%
              </span>
            )}
          </div>

          {/* Super Activation Button / Bar */}
          <div className="flex items-center gap-2">
            <button
              onClick={onActivateSuper}
              disabled={superEnergy < 100 && !isSuperActive}
              className={`pointer-events-auto flex items-center gap-2 px-6 py-2.5 rounded-2xl font-black font-ninja tracking-wider transition-all duration-200 active:scale-95 border ${
                superEnergy >= 100 || isSuperActive
                  ? 'bg-gradient-to-r from-orange-500 via-amber-500 to-red-600 text-slate-950 border-amber-300/80 shadow-[0_0_25px_#f97316] animate-pulse cursor-pointer'
                  : 'bg-[#0d101c]/80 text-slate-500 border-slate-800 cursor-not-allowed'
              }`}
            >
              <Zap className={`w-5 h-5 ${superEnergy >= 100 ? 'text-slate-950 fill-slate-950' : ''}`} />
              <span>SUPER CHAKRA</span>
            </button>
          </div>

          {/* Energy Progress Meter */}
          <div className="w-48 h-2.5 bg-[#0d101c]/90 rounded-full border border-orange-500/30 overflow-hidden backdrop-blur-md">
            <div
              className={`h-full transition-all duration-150 ${
                superEnergy >= 100
                  ? 'bg-gradient-to-r from-amber-400 via-orange-500 to-red-600'
                  : 'bg-orange-500'
              }`}
              style={{ width: `${superEnergy}%` }}
            />
          </div>
          <span className="text-[10px] text-amber-200/60 pr-1">Dica: [Espaço] ou palma aberta</span>
        </div>
      </div>
    </div>
  );
};
