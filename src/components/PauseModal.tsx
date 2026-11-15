import React from 'react';
import { Play, RefreshCw, Settings, LogOut } from 'lucide-react';

interface PauseModalProps {
  score: number;
  hearts: number;
  remainingSeconds: number;
  onResume: () => void;
  onRecalibrate: () => void;
  onOpenSettings: () => void;
  onExit: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  score,
  hearts,
  remainingSeconds,
  onResume,
  onRecalibrate,
  onOpenSettings,
  onExit,
}) => {
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center p-4 bg-[#08090d]/85 backdrop-blur-md select-none">
      <div className="w-full max-w-sm bg-[#0f131f]/95 border border-orange-500/40 rounded-3xl p-6 shadow-2xl shadow-orange-500/20 text-[#fffdf5] flex flex-col items-center text-center gap-4">
        <h2 className="text-3xl font-black font-ninja text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-amber-300 to-red-500 drop-shadow-[0_0_12px_#ea580c]">
          TREINO PAUSADO
        </h2>

        <div className="flex gap-4 text-xs bg-[#171c2b] px-4 py-2 rounded-2xl border border-orange-500/30">
          <div>
            <span className="text-amber-200/60 block">Pontos</span>
            <span className="font-bold text-amber-300 font-ninja text-sm">{score}</span>
          </div>
          <div className="w-px bg-slate-700" />
          <div>
            <span className="text-amber-200/60 block">Vidas</span>
            <span className="font-bold text-red-400 font-ninja text-sm">{hearts}</span>
          </div>
          <div className="w-px bg-slate-700" />
          <div>
            <span className="text-amber-200/60 block">Tempo</span>
            <span className="font-bold text-white font-ninja text-sm">{remainingSeconds}s</span>
          </div>
        </div>

        <p className="text-xs text-amber-100/80 max-w-xs">
          O tempo e as frutas estão congelados. Seus pontos e vidas de ninja estão preservados.
        </p>

        <div className="flex flex-col gap-2.5 w-full mt-2">
          {/* Continuar */}
          <button
            onClick={onResume}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-gradient-to-r from-orange-500 via-amber-500 to-red-600 hover:from-orange-400 hover:to-red-500 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.7)] font-black font-ninja transition-all shadow-lg shadow-orange-500/30 active:scale-95 cursor-pointer text-sm"
          >
            <Play className="w-4 h-4 fill-white text-white drop-shadow" />
            <span>CONTINUAR (3s)</span>
          </button>

          {/* Recalibrar agora */}
          <button
            onClick={onRecalibrate}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#171c2b] hover:bg-[#222a42] text-amber-200 text-xs font-bold border border-orange-500/30 transition-all cursor-pointer active:scale-95"
          >
            <RefreshCw className="w-4 h-4 text-orange-400" />
            <span>Recalibrar agora</span>
          </button>

          {/* Configurações */}
          <button
            onClick={onOpenSettings}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#171c2b] hover:bg-[#222a42] text-amber-200 text-xs font-bold border border-orange-500/30 transition-all cursor-pointer active:scale-95"
          >
            <Settings className="w-4 h-4 text-amber-400" />
            <span>Configurações</span>
          </button>

          {/* Sair da Partida */}
          <button
            onClick={onExit}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-950/40 hover:bg-red-900/60 border border-red-800/60 text-red-300 text-xs font-bold transition-all cursor-pointer active:scale-95 mt-1"
          >
            <LogOut className="w-4 h-4 text-red-400" />
            <span>Sair para o Menu</span>
          </button>
        </div>
      </div>
    </div>
  );
};
