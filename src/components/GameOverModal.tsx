import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  Trophy,
  RotateCcw,
  Download,
  Share2,
  Video,
} from 'lucide-react';
import { GameStats } from '../types/game';
import { RecordingResult } from '../recording/gameRecorder';

interface GameOverModalProps {
  stats: GameStats;
  recordingResult: RecordingResult | null;
  onPlayAgain: () => void;
  onChangeDifficulty: () => void;
  onRecalibrate: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  stats,
  recordingResult,
  onPlayAgain,
  onChangeDifficulty,
  onRecalibrate,
}) => {
  const [isNewRecord, setIsNewRecord] = useState<boolean>(false);
  const [personalBest, setPersonalBest] = useState<number>(0);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  useEffect(() => {
    // Efeito de confete festivo estilo Chakra / Folha / Fogo
    confetti({
      particleCount: 120,
      spread: 75,
      origin: { y: 0.6 },
      colors: ['#ff7a00', '#f59e0b', '#22c55e', '#dc2626', '#fef3c7'],
    });

    const recordKey = `ghost_fruit_record_${stats.mode}`;
    const holderKey = `ghost_fruit_record_holder_${stats.mode}`;
    const storedBest = parseInt(localStorage.getItem(recordKey) || '0', 10);
    setPersonalBest(storedBest);

    if (stats.score > storedBest) {
      setIsNewRecord(true);
      setPersonalBest(stats.score);
      localStorage.setItem(recordKey, stats.score.toString());
      if (stats.playerName) {
        localStorage.setItem(holderKey, stats.playerName);
      }
    }

    try {
      const historyKey = 'ghost_fruit_match_history';
      const history = JSON.parse(localStorage.getItem(historyKey) || '[]');
      history.unshift({
        ...stats,
        playerName: stats.playerName || 'Shinobi',
      });
      localStorage.setItem(historyKey, JSON.stringify(history.slice(0, 30)));
    } catch (e) {}
  }, []);

  const totalAttempted = stats.fruitsCut + stats.fruitsMissed;
  const accuracy = totalAttempted > 0 ? `${Math.round((stats.fruitsCut / totalAttempted) * 100)}%` : '—';

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}m ${s < 10 ? '0' : ''}${s}s`;
  };

  const handleDownloadVideo = () => {
    if (!recordingResult) return;
    const a = document.createElement('a');
    a.href = recordingResult.url;
    a.download = stats.isPortfolioMode
      ? `ghost-fruit-wander-franca-${stats.score}pts.mp4`
      : recordingResult.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleShare = async () => {
    const shareText = `Joguei Ghost Fruit e fiz ${stats.score} pontos como Shinobi no modo ${stats.mode}! Precisão de ${accuracy}. Consegue superar meu ninjutsu?`;

    if (navigator.share) {
      try {
        if (recordingResult && navigator.canShare && navigator.canShare({ files: [new File([recordingResult.blob], recordingResult.filename, { type: recordingResult.mimeType })] })) {
          await navigator.share({
            title: 'Meu Treino Shinobi no Ghost Fruit',
            text: shareText,
            files: [new File([recordingResult.blob], recordingResult.filename, { type: recordingResult.mimeType })],
          });
          return;
        }

        await navigator.share({
          title: 'Ghost Fruit',
          text: shareText,
          url: window.location.href,
        });
      } catch (err) {}
    } else {
      navigator.clipboard.writeText(shareText);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center p-4 bg-[#08090d]/85 backdrop-blur-lg select-none overflow-y-auto">
      <div className="relative w-full max-w-lg bg-[#0f131f]/95 border border-orange-500/40 rounded-3xl p-6 shadow-2xl shadow-orange-500/20 text-[#fffdf5] my-auto">
        {/* Header / Mascote & Título */}
        <div className="flex flex-col items-center text-center gap-1.5">
          <div className="relative mb-1">
            <img
              src="/mascot.jpg"
              alt="Mascote Shinobi"
              className="w-20 h-20 rounded-full object-cover border-2 border-orange-500 shadow-[0_0_20px_#f97316]"
            />
          </div>

          {isNewRecord ? (
            <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-orange-500/30 to-amber-500/30 border border-orange-400 text-amber-300 font-black text-sm uppercase tracking-wider font-ninja animate-bounce">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>NOVO RECORDE SHINOBI!</span>
            </div>
          ) : (
            <span className="text-xs uppercase tracking-widest text-orange-400 font-bold">
              Treino Shinobi Concluído
            </span>
          )}

          <h1 className="text-4xl font-black font-ninja text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-amber-300 to-red-500 drop-shadow-[0_0_18px_#ea580c]">
            {stats.score}
            <span className="text-lg font-bold text-amber-200/80 ml-1">pts</span>
          </h1>

          {stats.playerName && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#171c2b] border border-orange-500/30 text-xs">
              <span className="text-amber-200/70">Jogador:</span>
              <span className="font-bold text-amber-300 font-ninja">{stats.playerName}</span>
            </div>
          )}

          <p className="text-xs text-amber-200/80">
            {stats.gameOverReason === 'time_up'
              ? 'Tempo esgotado! Excelente técnica com a katana!'
              : 'Seus corações se esgotaram. Treine novamente e fortaleça seu chakra!'}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 my-5 text-left text-xs">
          {/* Recorde Anterior */}
          <div className="bg-[#171c2b] p-3 rounded-2xl border border-orange-500/30">
            <span className="text-amber-200/60 block mb-0.5">Recorde do Modo</span>
            <span className="text-base font-bold text-amber-400 font-ninja">{personalBest}</span>
          </div>

          {/* Dificuldade */}
          <div className="bg-[#171c2b] p-3 rounded-2xl border border-orange-500/30">
            <span className="text-amber-200/60 block mb-0.5">Nível Shinobi</span>
            <span className="text-base font-bold text-orange-300 uppercase font-ninja">{stats.mode}</span>
          </div>

          {/* Nível Alcançado */}
          <div className="bg-[#171c2b] p-3 rounded-2xl border border-orange-500/30">
            <span className="text-amber-200/60 block mb-0.5">Nível Máximo</span>
            <span className="text-base font-bold text-emerald-400 font-ninja">Nível {stats.highestLevel}</span>
          </div>

          {/* Frutas Cortadas */}
          <div className="bg-[#171c2b] p-3 rounded-2xl border border-orange-500/30">
            <span className="text-amber-200/60 block mb-0.5">Frutas Cortadas</span>
            <span className="text-base font-bold text-emerald-400 font-ninja">{stats.fruitsCut}</span>
          </div>

          {/* Frutas Perdidas */}
          <div className="bg-[#171c2b] p-3 rounded-2xl border border-orange-500/30">
            <span className="text-amber-200/60 block mb-0.5">Frutas Perdidas</span>
            <span className="text-base font-bold text-red-400 font-ninja">{stats.fruitsMissed}</span>
          </div>

          {/* Taxa de Aproveitamento / Precisão */}
          <div className="bg-[#171c2b] p-3 rounded-2xl border border-orange-500/30">
            <span className="text-amber-200/60 block mb-0.5">Aproveitamento</span>
            <span className="text-base font-bold text-white font-ninja">{accuracy}</span>
          </div>

          {/* Bombas Atingidas */}
          <div className="bg-[#171c2b] p-3 rounded-2xl border border-orange-500/30">
            <span className="text-amber-200/60 block mb-0.5">Bombas Armadilha</span>
            <span className="text-base font-bold text-red-400 font-ninja">{stats.bombsHit}</span>
          </div>

          {/* Maior Combo */}
          <div className="bg-[#171c2b] p-3 rounded-2xl border border-orange-500/30">
            <span className="text-amber-200/60 block mb-0.5">Melhor Combo</span>
            <span className="text-base font-bold text-amber-300 font-ninja">
              {stats.bestCombo > 0 ? `${stats.bestCombo}x` : '—'}
            </span>
          </div>

          {/* Tempo Jogado */}
          <div className="bg-[#171c2b] p-3 rounded-2xl border border-orange-500/30">
            <span className="text-amber-200/60 block mb-0.5">Tempo de Treino</span>
            <span className="text-base font-bold text-slate-200">{formatSeconds(stats.timePlayedSeconds)}</span>
          </div>
        </div>

        {/* Dynamic Assistance Badge */}
        {stats.dynamicAssistanceUsed && (
          <div className="mb-4 text-[11px] text-amber-200/70 bg-[#171c2b]/60 px-3 py-1.5 rounded-xl border border-orange-500/30 text-center">
            Assistência dinâmica shinobi foi ativada após perdas consecutivas de vida.
          </div>
        )}

        {/* Video Preview & Download Section */}
        {recordingResult && (
          <div className="bg-[#171c2b]/80 p-3.5 rounded-2xl border border-orange-500/40 mb-4 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Video className="w-4 h-4 text-orange-400" />
                <span className="text-xs font-bold text-white">Gravação da Partida</span>
              </div>
              <span className="text-[10px] text-amber-300 bg-orange-950/70 px-2 py-0.5 rounded-full border border-orange-500/40">
                Vídeo HD
              </span>
            </div>

            <video
              src={recordingResult.url}
              controls
              className="w-full max-h-40 rounded-xl bg-black border border-slate-700/80"
            />

            <div className="flex gap-2 mt-1">
              <button
                onClick={handleDownloadVideo}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-orange-500 hover:bg-orange-400 text-slate-950 text-xs font-bold transition-all shadow cursor-pointer active:scale-95"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Baixar Vídeo</span>
              </button>

              <button
                onClick={handleShare}
                className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-[#232a40] hover:bg-[#2d3652] text-white text-xs font-bold transition-all cursor-pointer active:scale-95"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>{copiedLink ? 'Copiado!' : 'Compartilhar'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Primary Actions */}
        <div className="flex flex-col gap-2 w-full mt-2">
          <button
            onClick={onPlayAgain}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-gradient-to-r from-orange-500 via-amber-500 to-red-600 hover:from-orange-400 hover:to-red-500 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.7)] font-black font-ninja tracking-wider transition-all shadow-lg shadow-orange-500/30 active:scale-95 cursor-pointer text-sm"
          >
            <RotateCcw className="w-5 h-5 text-white" />
            <span>JOGAR NOVAMENTE</span>
          </button>

          <div className="flex gap-2">
            <button
              onClick={onChangeDifficulty}
              className="flex-1 py-2.5 rounded-xl bg-[#171c2b] hover:bg-[#222a42] text-amber-200 text-xs font-bold border border-orange-500/30 transition-all cursor-pointer"
            >
              Trocar Nível
            </button>
            <button
              onClick={onRecalibrate}
              className="flex-1 py-2.5 rounded-xl bg-[#171c2b] hover:bg-[#222a42] text-amber-200 text-xs font-bold border border-orange-500/30 transition-all cursor-pointer"
            >
              Recalibrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
