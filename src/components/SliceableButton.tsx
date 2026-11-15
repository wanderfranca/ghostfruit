import React, { useState, useRef, useEffect, useCallback } from 'react';

export const playBladeSlashSound = () => {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    const now = ctx.currentTime;
    // 1. Ruído aerodinâmico da lâmina no ar (whoosh)
    const bufferSize = Math.floor(ctx.sampleRate * 0.16);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(3200, now);
    filter.frequency.exponentialRampToValueAtTime(600, now + 0.15);
    filter.Q.setValueAtTime(3.5, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.4, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    // 2. Ressonância metálica de corte rápido (zing de aço da katana)
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1900, now);
    osc.frequency.exponentialRampToValueAtTime(2600, now + 0.03);
    osc.frequency.exponentialRampToValueAtTime(380, now + 0.15);

    oscGain.gain.setValueAtTime(0.01, now);
    oscGain.gain.linearRampToValueAtTime(0.25, now + 0.02);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(oscGain);
    oscGain.connect(ctx.destination);

    noise.start(now);
    osc.start(now);
    noise.stop(now + 0.16);
    osc.stop(now + 0.15);
  } catch (e) {
    // Autoplay fallback
  }
};

interface SliceableButtonProps {
  children: React.ReactNode;
  onSlice: () => void;
  className?: string;
  respawnAfterMs?: number; // Se informado, o botão se reconstitui após este tempo
  currentFingerPos?: { x: number; y: number } | null;
  isIndexExtended?: boolean;
  disabled?: boolean;
  title?: string;
}

interface Spark {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
}

export const SliceableButton: React.FC<SliceableButtonProps> = ({
  children,
  onSlice,
  className = '',
  respawnAfterMs,
  currentFingerPos,
  isIndexExtended = true,
  disabled = false,
  title,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isSliced, setIsSliced] = useState<boolean>(false);
  const [slashVisible, setSlashVisible] = useState<boolean>(false);
  const [sparks, setSparks] = useState<Spark[]>([]);
  const isTriggeringRef = useRef<boolean>(false);

  const triggerSlice = useCallback(() => {
    if (disabled || isTriggeringRef.current) return;
    isTriggeringRef.current = true;
    setIsSliced(true);
    setSlashVisible(true);
    playBladeSlashSound();

    // Gera faíscas dinâmicas ao longo da linha de corte
    const sparkColors = ['#ffffff', '#fef08a', '#f59e0b', '#ea580c', '#ef4444'];
    const newSparks: Spark[] = Array.from({ length: 14 }).map((_, i) => ({
      id: i,
      x: 15 + Math.random() * 70, // % ao longo do botão
      y: 40 + (Math.random() - 0.5) * 25,
      vx: (Math.random() - 0.5) * 90,
      vy: (Math.random() - 0.5) * 90,
      size: 3 + Math.random() * 4,
      color: sparkColors[Math.floor(Math.random() * sparkColors.length)],
    }));
    setSparks(newSparks);

    setTimeout(() => {
      setSlashVisible(false);
      setSparks([]);
    }, 280);

    // Executa a ação do clique/corte
    setTimeout(() => {
      onSlice();
      if (respawnAfterMs) {
        setTimeout(() => {
          setIsSliced(false);
          isTriggeringRef.current = false;
        }, respawnAfterMs);
      } else {
        isTriggeringRef.current = false;
      }
    }, 320);
  }, [disabled, onSlice, respawnAfterMs]);

  // Monitora o indicador da câmera passando por cima do botão
  useEffect(() => {
    if (disabled || isSliced || !currentFingerPos || !isIndexExtended) return;

    const el = containerRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const pad = 10;

    const inBounds =
      currentFingerPos.x >= rect.left - pad &&
      currentFingerPos.x <= rect.right + pad &&
      currentFingerPos.y >= rect.top - pad &&
      currentFingerPos.y <= rect.bottom + pad;

    if (inBounds) {
      triggerSlice();
    }
  }, [currentFingerPos, isIndexExtended, disabled, isSliced, triggerSlice]);

  return (
    <div
      ref={containerRef}
      title={title}
      onClick={() => triggerSlice()}
      onPointerEnter={(e) => {
        // Se estiver arrastando com botão pressionado ou swiping rápido
        if (e.buttons > 0 || e.pressure > 0) {
          triggerSlice();
        }
      }}
      className={`relative select-none cursor-pointer group ${disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
      style={{ perspective: '800px' }}
    >
      {/* Botão Normal (Quando não cortado) */}
      {!isSliced && (
        <div
          className={`transition-transform duration-150 active:scale-95 group-hover:scale-[1.03] ${className}`}
        >
          {children}
        </div>
      )}

      {/* Animação do Botão Fatiado em Duas Metades */}
      {isSliced && (
        <div className="relative pointer-events-none">
          {/* Metade Superior-Esquerda (desliza para cima e esquerda) */}
          <div
            className={`transition-all duration-300 ease-out transform -translate-x-3.5 -translate-y-3 -rotate-6 opacity-85 shadow-lg ${className}`}
            style={{
              clipPath: 'polygon(0 0, 100% 0, 100% 36%, 0 68%)',
            }}
          >
            {children}
          </div>

          {/* Metade Inferior-Direita (desliza para baixo e direita) */}
          <div
            className={`absolute inset-0 transition-all duration-300 ease-out transform translate-x-3.5 translate-y-3 rotate-6 opacity-85 shadow-lg ${className}`}
            style={{
              clipPath: 'polygon(0 68%, 100% 36%, 100% 100%, 0 100%)',
            }}
          >
            {children}
          </div>

          {/* Linha Laser/Chakra da Lâmina no momento do corte */}
          {slashVisible && (
            <div
              className="absolute inset-0 z-30 pointer-events-none flex items-center justify-center animate-ping"
              style={{
                transform: 'rotate(-16deg)',
              }}
            >
              <div className="w-[125%] h-[3px] bg-white shadow-[0_0_12px_#ffffff,0_0_24px_#f97316,0_0_40px_#ea580c] rounded-full" />
            </div>
          )}

          {/* Faíscas de energia do corte */}
          {sparks.map((spark) => (
            <div
              key={spark.id}
              className="absolute rounded-full pointer-events-none animate-ping"
              style={{
                left: `${spark.x}%`,
                top: `${spark.y}%`,
                width: `${spark.size}px`,
                height: `${spark.size}px`,
                backgroundColor: spark.color,
                boxShadow: `0 0 8px ${spark.color}`,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};
