import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Disc3,
  Camera,
  RefreshCw,
  Settings,
  Trophy,
  Sparkles,
  HelpCircle,
  Loader2,
} from 'lucide-react';
import { GameMode } from '../types/game';
import { AnimatedTempleBackground } from './AnimatedTempleBackground';

interface StartScreenProps {
  currentMode: GameMode;
  onSelectMode: (mode: GameMode) => void;
  onStartGame: (recordVideo: boolean, isPortfolio?: boolean, playerName?: string) => void;
  onRecalibrate: () => void;
  onOpenSettings: () => void;
  isCameraActive: boolean;
  onActivateCamera: () => void;
  hasCalibration: boolean;
  isMediaPipeReady: boolean;
  cameraError: string | null;
  isRequestingCamera?: boolean;
}

export const StartScreen: React.FC<StartScreenProps> = ({
  currentMode,
  onSelectMode,
  onStartGame,
  onRecalibrate,
  onOpenSettings,
  isCameraActive,
  onActivateCamera,
  hasCalibration,
  isMediaPipeReady,
  cameraError,
  isRequestingCamera = false,
}) => {
  const [personalBest, setPersonalBest] = useState<number>(0);
  const [recordHolder, setRecordHolder] = useState<string>('');
  const [showHowToPlay, setShowHowToPlay] = useState<boolean>(false);
  const [playerName, setPlayerName] = useState<string>(() => {
    return localStorage.getItem('ghost_fruit_player_name') || 'Wander França';
  });
  const [nameError, setNameError] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const isWander =
    playerName.trim().toLowerCase().includes('wander') &&
    (playerName.trim().toLowerCase().includes('frança') ||
      playerName.trim().toLowerCase().includes('franca'));

  useEffect(() => {
    const recordKey = `ghost_fruit_record_${currentMode}`;
    const holderKey = `ghost_fruit_record_holder_${currentMode}`;
    const best = parseInt(localStorage.getItem(recordKey) || '0', 10);
    const holder = localStorage.getItem(holderKey) || '';
    setPersonalBest(best);
    setRecordHolder(holder);
  }, [currentMode]);

  const handleStartWithValidation = (recordVideo: boolean) => {
    const trimmed = playerName.trim();
    if (!trimmed) {
      setNameError(true);
      inputRef.current?.focus();
      return;
    }
    setNameError(false);
    localStorage.setItem('ghost_fruit_player_name', trimmed);
    onStartGame(recordVideo, isWander, trimmed);
  };

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center p-4 select-none overflow-y-auto">
      {/* Cenário do Templo Samurai Animado com Fumaça Realística e Folhas Mexendo */}
      <AnimatedTempleBackground />

      {/* Formulário Principal (Card) à frente do Templo Samurai */}
      <div className="relative z-10 w-full max-w-md bg-[#0f131f]/92 backdrop-blur-xl border border-orange-500/50 rounded-3xl p-6 shadow-[0_0_60px_rgba(0,0,0,0.9)] text-[#fffdf5] flex flex-col items-center text-center my-auto ring-1 ring-amber-400/30">
        {/* Mascote Oficial Shinobi com animação apenas nas bordas laranjas */}
        <div className="flex flex-col items-center gap-1.5">
          <div className="relative my-1 flex items-center justify-center">
            {/* Brilho pulsante estritamente na borda externa */}
            <div className="absolute -inset-1 rounded-full border-2 border-amber-400/70 shadow-[0_0_25px_#f97316] animate-pulse pointer-events-none" />
            <img
              src="/mascot.jpg"
              alt="Mascote Shinobi Ghost Fruit"
              className="w-28 h-28 rounded-full object-cover border-4 border-orange-500 relative z-10 transition-transform duration-300 hover:scale-105"
            />
          </div>

          <h1 className="text-3xl sm:text-4xl font-black font-ninja tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-amber-300 to-red-500 drop-shadow-[0_0_20px_#ea580c] mt-1">
            GHOST FRUIT
          </h1>
          <p className="text-[11px] uppercase tracking-widest text-orange-200/90 font-bold">
            ⚔️ Lâmina Shinobi & Visão Computacional ⚔️
          </p>
        </div>

        {/* Record for selected mode */}
        <div className="my-2.5 flex justify-center">
          <div
            className={`flex items-center gap-1.5 bg-[#171c2b]/90 px-4 py-1.5 rounded-2xl border transition-all ${
              currentMode === 'iniciante'
                ? 'border-sky-500/40'
                : currentMode === 'desafio'
                ? 'border-red-500/40'
                : 'border-amber-500/40'
            }`}
          >
            <Trophy
              className={`w-3.5 h-3.5 ${
                currentMode === 'iniciante'
                  ? 'text-sky-400'
                  : currentMode === 'desafio'
                  ? 'text-red-400'
                  : 'text-amber-400'
              }`}
            />
            <span className="text-xs text-amber-100/80">Recorde ({currentMode}):</span>
            <span
              className={`text-xs font-black font-ninja ${
                currentMode === 'iniciante'
                  ? 'text-sky-300'
                  : currentMode === 'desafio'
                  ? 'text-white'
                  : 'text-amber-300'
              }`}
            >
              {personalBest} pts{recordHolder && personalBest > 0 ? ` • ${recordHolder}` : ''}
            </span>
          </div>
        </div>

        {/* Camera Permission Alert if not active */}
        {!isCameraActive && (
          <div className="w-full bg-[#181d2e]/95 border border-orange-500/40 p-4 rounded-2xl mb-3 flex flex-col items-center gap-2">
            <Camera className="w-7 h-7 text-orange-400 animate-pulse" />
            <span className="text-xs font-bold text-orange-300">
              {isRequestingCamera ? 'Conectando à Câmera Shinobi...' : 'Câmera Necessária'}
            </span>
            <p className="text-[11px] text-slate-300">
              {isRequestingCamera
                ? 'Aguardando confirmação de permissão no navegador...'
                : 'O jogo utiliza sua câmera para rastrear seu dedo e colocar você dentro do dojo.'}
            </p>
            {cameraError && !isRequestingCamera && (
              <p className="text-[11px] text-red-300 bg-red-950/80 p-2 rounded-xl border border-red-800/80">
                {cameraError}
              </p>
            )}
            <button
              onClick={onActivateCamera}
              disabled={isRequestingCamera}
              className="mt-1 flex items-center gap-2 px-6 py-2 rounded-xl bg-orange-500 hover:bg-orange-400 text-slate-950 font-bold text-xs transition-all shadow-md shadow-orange-500/30 cursor-pointer active:scale-95 disabled:opacity-60"
            >
              {isRequestingCamera && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{isRequestingCamera ? 'Autorizando...' : 'Ativar Câmera'}</span>
            </button>
          </div>
        )}

        {/* Mode Selector */}
        <div className="w-full flex flex-col gap-1.5 mb-4 text-left">
          <span className="text-[11px] uppercase tracking-wider text-amber-300/80 font-bold">
            Nível Shinobi (Dificuldade)
          </span>
          <div className="grid grid-cols-3 gap-2">
            {(['iniciante', 'normal', 'desafio'] as GameMode[]).map((mode) => {
              const isSelected = currentMode === mode;
              let containerStyle = 'bg-[#151928] border-slate-700/80 text-slate-400 hover:text-slate-200';
              let titleStyle = 'text-slate-300 font-bold';
              let subtitleStyle = 'text-slate-400';

              if (isSelected) {
                if (mode === 'iniciante') {
                  // Iniciante: azulzinho
                  containerStyle = 'bg-sky-500/25 border-sky-400 shadow-md shadow-sky-500/30 ring-1 ring-sky-400/50';
                  titleStyle = 'text-sky-200 font-bold';
                  subtitleStyle = 'text-sky-300/90 font-medium';
                } else if (mode === 'desafio') {
                  // Desafio: vermelho com fontes brancas
                  containerStyle = 'bg-red-600/35 border-red-500 shadow-md shadow-red-600/35 ring-1 ring-red-400/60';
                  titleStyle = 'text-white font-black drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]';
                  subtitleStyle = 'text-white font-bold drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]';
                } else {
                  // Normal: laranja do branding (atual)
                  containerStyle = 'bg-orange-500/25 border-orange-400 shadow-md shadow-orange-500/25 ring-1 ring-orange-400/40';
                  titleStyle = 'text-orange-300 font-bold';
                  subtitleStyle = 'text-amber-200/80 font-medium';
                }
              }

              return (
                <button
                  key={mode}
                  onClick={() => onSelectMode(mode)}
                  className={`py-2 px-1 rounded-xl border flex flex-col items-center justify-center transition-all cursor-pointer ${containerStyle}`}
                >
                  <span className={`text-xs uppercase ${titleStyle}`}>{mode}</span>
                  <span className={`text-[9px] mt-0.5 ${subtitleStyle}`}>
                    {mode === 'iniciante' ? 'Genin' : mode === 'normal' ? 'Chunin' : 'Jonin'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Identificação do Jogador (Obrigatório para Ranking) */}
        <div className="w-full flex flex-col gap-1.5 mb-3.5 text-left">
          <div className="flex items-center justify-between">
            <label htmlFor="player-name-input" className="text-[11px] uppercase tracking-wider text-amber-300/90 font-bold flex items-center">
              Nome do Jogador
              <span className="text-red-400 ml-1 font-black">*</span>
              <span className="text-[10px] text-amber-300/60 lowercase font-normal ml-1.5">
                (obrigatório p/ ranking)
              </span>
            </label>
          </div>
          <div className="relative">
            <input
              id="player-name-input"
              ref={inputRef}
              type="text"
              value={playerName}
              onChange={(e) => {
                setPlayerName(e.target.value);
                if (nameError && e.target.value.trim().length > 0) {
                  setNameError(false);
                }
              }}
              placeholder="Digite seu nome para pontuar..."
              maxLength={28}
              className={`w-full px-3.5 py-2 rounded-xl bg-[#151928] border text-xs text-amber-100 placeholder-slate-500 focus:outline-none transition-all ${
                nameError
                  ? 'border-red-500 ring-2 ring-red-500/40 bg-red-950/20'
                  : 'border-slate-700/80 focus:border-orange-500/80'
              }`}
            />
          </div>
          {nameError && (
            <span className="text-[10px] text-red-400 font-semibold flex items-center gap-1 animate-pulse">
              ⚠️ O nome do jogador é obrigatório para registrar a pontuação no ranking!
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="w-full flex flex-col gap-2.5">
          {/* Jogar */}
          <button
            onClick={() => handleStartWithValidation(false)}
            disabled={!isMediaPipeReady}
            className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-black font-ninja tracking-wider transition-all shadow-lg active:scale-95 cursor-pointer text-base ${
              isMediaPipeReady
                ? 'bg-gradient-to-r from-orange-500 via-amber-500 to-red-600 hover:from-orange-400 hover:to-red-500 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.7)] shadow-orange-500/30'
                : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
            }`}
          >
            <Play className="w-5 h-5 fill-white text-white drop-shadow" />
            <span>{isMediaPipeReady ? 'JOGAR AGORA' : 'Carregando Chakra...'}</span>
          </button>

          {/* Jogar e Gravar */}
          <button
            onClick={() => handleStartWithValidation(true)}
            disabled={!isMediaPipeReady}
            className={`w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-bold font-ninja tracking-wider transition-all shadow cursor-pointer active:scale-95 text-xs ${
              isMediaPipeReady
                ? 'bg-red-950/70 hover:bg-red-900/80 border border-red-600/70 text-red-200'
                : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
            }`}
          >
            <Disc3 className="w-4 h-4 text-red-400 animate-spin" />
            <span>JOGAR E GRAVAR</span>
          </button>
        </div>

        {/* Secondary options */}
        <div className="w-full flex justify-between gap-2 mt-4 pt-3 border-t border-slate-800/80 text-xs">
          <button
            onClick={onRecalibrate}
            className="flex items-center gap-1.5 text-amber-200/80 hover:text-orange-400 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-orange-400" />
            <span>Recalibrar</span>
          </button>

          <button
            onClick={() => setShowHowToPlay(!showHowToPlay)}
            className="flex items-center gap-1.5 text-amber-200/80 hover:text-orange-400 transition-colors cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
            <span>Regras Shinobi</span>
          </button>

          <button
            onClick={onOpenSettings}
            className="flex items-center gap-1.5 text-amber-200/80 hover:text-orange-400 transition-colors cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5 text-orange-400" />
            <span>Configurações</span>
          </button>
        </div>

        {/* How to Play accordion */}
        {showHowToPlay && (
          <div className="w-full mt-3 p-3 bg-[#131726] rounded-2xl border border-orange-500/30 text-left text-xs text-amber-100/90 space-y-1.5">
            <p>• <b>Lâmina Katana:</b> Aponte o indicador para cortar. Recolha para embainhar.</p>
            <p>• <b>Frutas:</b> Fruta comum (+10 pts), Fruta especial (+25 pts).</p>
            <p>• <b>Combos Shinobi:</b> Corte 3+ frutas no mesmo golpe contínuo para até 4× pontos!</p>
            <p>• <b>Bombas Armadilha:</b> Evite cortar bombas (−50 pts e −1 coração).</p>
            <p>• <b>Modo Chakra Super:</b> Com 100 de energia, aperte [Espaço], o botão ou abra a palma por 800ms!</p>
          </div>
        )}
      </div>
    </div>
  );
};
