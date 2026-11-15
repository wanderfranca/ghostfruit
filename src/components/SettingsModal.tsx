import React from 'react';
import {
  X,
  Camera,
  Moon,
  Volume2,
  MousePointer,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { GameSettings } from '../types/game';
import { VideoDeviceInfo } from '../camera/cameraManager';

interface SettingsModalProps {
  settings: GameSettings;
  availableCameras: VideoDeviceInfo[];
  onUpdateSettings: (newSettings: Partial<GameSettings>) => void;
  onRecalibrate: () => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  availableCameras,
  onUpdateSettings,
  onRecalibrate,
  onClose,
}) => {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-[#08090d]/85 backdrop-blur-md select-none overflow-y-auto">
      <div className="relative w-full max-w-md bg-[#0f131f]/95 border border-orange-500/40 rounded-3xl p-6 shadow-2xl shadow-orange-500/20 text-[#fffdf5] my-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
          <h2 className="text-xl font-black font-ninja text-amber-300">CONFIGURAÇÕES SHINOBI</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 text-xs">
          {/* Câmera e Entrada */}
          <div className="bg-[#171c2b] p-3.5 rounded-2xl border border-orange-500/30 space-y-3">
            <div className="flex items-center gap-2 text-orange-400 font-bold text-sm">
              <Camera className="w-4 h-4" />
              <span>Câmera e Controle</span>
            </div>

            {/* Modo de Entrada */}
            <div className="flex flex-col gap-1.5">
              <span className="text-slate-300">Modo de Entrada:</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => onUpdateSettings({ inputMode: 'camera' })}
                  className={`py-2 px-3 rounded-xl border font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                    settings.inputMode === 'camera'
                      ? 'bg-orange-500/20 border-orange-400 text-orange-300 font-ninja'
                      : 'bg-slate-900/60 border-slate-700 text-slate-400'
                  }`}
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Câmera (Mão)</span>
                </button>
                <button
                  onClick={() => onUpdateSettings({ inputMode: 'touch_mouse' })}
                  className={`py-2 px-3 rounded-xl border font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                    settings.inputMode === 'touch_mouse'
                      ? 'bg-amber-500/20 border-amber-400 text-amber-300 font-ninja'
                      : 'bg-slate-900/60 border-slate-700 text-slate-400'
                  }`}
                >
                  <MousePointer className="w-3.5 h-3.5" />
                  <span>Mouse / Toque</span>
                </button>
              </div>
            </div>

            {/* Seleção de Câmera (Desktop) */}
            {availableCameras.length > 1 && (
              <div className="flex flex-col gap-1">
                <span className="text-slate-300">Dispositivo de Câmera:</span>
                <select
                  value={settings.cameraDeviceId}
                  onChange={(e) => onUpdateSettings({ cameraDeviceId: e.target.value })}
                  className="bg-slate-900 border border-slate-700 text-white rounded-xl p-2 outline-none"
                >
                  {availableCameras.map((cam) => (
                    <option key={cam.deviceId} value={cam.deviceId}>
                      {cam.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Alternar Frontal / Traseira (Mobile) */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-slate-300">Câmera Frontal (Espelhada):</span>
              <button
                onClick={() => onUpdateSettings({ isFrontCamera: !settings.isFrontCamera })}
                className={`px-3 py-1 rounded-xl border font-bold cursor-pointer transition-all ${
                  settings.isFrontCamera
                    ? 'bg-orange-500/20 border-orange-400 text-orange-300'
                    : 'bg-slate-900 border-slate-700 text-slate-400'
                }`}
              >
                {settings.isFrontCamera ? 'Frontal (Espelho)' : 'Traseira'}
              </button>
            </div>

            {/* Esqueleto da mão */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-slate-300">Exibir Esqueleto da Mão:</span>
              <button
                onClick={() => onUpdateSettings({ showSkeleton: !settings.showSkeleton })}
                className={`px-3 py-1 rounded-xl border font-bold cursor-pointer transition-all ${
                  settings.showSkeleton
                    ? 'bg-orange-500/20 border-orange-400 text-orange-300'
                    : 'bg-slate-900 border-slate-700 text-slate-400'
                }`}
              >
                {settings.showSkeleton ? 'Ativado' : 'Oculto'}
              </button>
            </div>
          </div>

          {/* Embelezamento e Suavização Facial */}
          <div className="bg-[#171c2b] p-3.5 rounded-2xl border border-orange-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-orange-400 font-bold text-sm">
                <Sparkles className="w-4 h-4 text-orange-400" />
                <span>Embelezamento Facial (Efeito Suave)</span>
              </div>
              <span className="text-xs font-bold text-amber-300 font-ninja">
                {settings.beautyLevel === 0
                  ? 'Desativado'
                  : settings.beautyLevel <= 40
                  ? 'Sutil'
                  : settings.beautyLevel <= 70
                  ? 'Natural'
                  : 'Radiante'}
              </span>
            </div>

            <p className="text-[11px] text-amber-100/80 leading-relaxed">
              Suaviza texturas da pele, reduz ruídos da câmera e adiciona um brilho aveludado idêntico aos filtros de selfies dos smartphones.
            </p>

            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between text-slate-300">
                <span>Intensidade da Suavidade:</span>
                <span className="font-bold text-orange-300">{settings.beautyLevel}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={settings.beautyLevel}
                onChange={(e) => onUpdateSettings({ beautyLevel: parseInt(e.target.value, 10) })}
                className="w-full accent-orange-500 cursor-pointer"
              />
            </div>

            {/* Presets Rápidos */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              {[
                { label: 'Original', val: 0 },
                { label: 'Natural (55%)', val: 55 },
                { label: 'Radiante (80%)', val: 80 },
              ].map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => onUpdateSettings({ beautyLevel: preset.val })}
                  className={`py-1.5 px-2 rounded-xl border text-[11px] font-bold cursor-pointer transition-all ${
                    settings.beautyLevel === preset.val
                      ? 'bg-orange-500/20 border-orange-400 text-orange-300 shadow'
                      : 'bg-slate-900/60 border-slate-700 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Visual e Contraste */}
          <div className="bg-[#171c2b] p-3.5 rounded-2xl border border-orange-500/30 space-y-3">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
              <Moon className="w-4 h-4" />
              <span>Cenário e Contraste</span>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between text-slate-300">
                <span>Escurecimento do Cenário:</span>
                <span className="font-bold text-amber-300">{settings.darkenLevel}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="80"
                step="5"
                value={settings.darkenLevel}
                onChange={(e) => onUpdateSettings({ darkenLevel: parseInt(e.target.value, 10) })}
                className="w-full accent-orange-500 cursor-pointer"
              />
              <span className="text-[10px] text-slate-400">
                Aumente o escurecimento para que as frutas fiquem mais nítidas sobre seu ambiente.
              </span>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-slate-300">Reduzir Efeitos / Movimento:</span>
              <button
                onClick={() => onUpdateSettings({ reduceMotion: !settings.reduceMotion })}
                className={`px-3 py-1 rounded-xl border font-bold cursor-pointer transition-all ${
                  settings.reduceMotion
                    ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                    : 'bg-slate-900 border-slate-700 text-slate-400'
                }`}
              >
                {settings.reduceMotion ? 'Reduzido' : 'Normal'}
              </button>
            </div>
          </div>

          {/* Áudio */}
          <div className="bg-[#171c2b] p-3.5 rounded-2xl border border-orange-500/30 space-y-3">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
              <Volume2 className="w-4 h-4" />
              <span>Áudio do Jogo</span>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between text-slate-300">
                <span>Volume dos Efeitos Sonoros:</span>
                <span className="font-bold text-amber-300">{settings.sfxVolume}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={settings.sfxVolume}
                onChange={(e) => onUpdateSettings({ sfxVolume: parseInt(e.target.value, 10) })}
                className="w-full accent-orange-500 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-slate-300">Gravar Sons do Jogo (SFX):</span>
              <button
                onClick={() => onUpdateSettings({ recordAudio: !settings.recordAudio })}
                className={`px-3 py-1 rounded-xl border font-bold cursor-pointer transition-all ${
                  settings.recordAudio
                    ? 'bg-orange-500/20 border-orange-400 text-orange-300'
                    : 'bg-slate-900 border-slate-700 text-slate-400'
                }`}
              >
                {settings.recordAudio ? 'Sim' : 'Não'}
              </button>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-slate-300">Gravar Microfone / Voz:</span>
              <button
                onClick={() => onUpdateSettings({ recordMic: !settings.recordMic })}
                className={`px-3 py-1 rounded-xl border font-bold cursor-pointer transition-all ${
                  settings.recordMic
                    ? 'bg-orange-500/20 border-orange-400 text-orange-300'
                    : 'bg-slate-900 border-slate-700 text-slate-400'
                }`}
              >
                {settings.recordMic ? 'Sim' : 'Não'}
              </button>
            </div>
          </div>

          {/* Recalibração e Privacidade */}
          <div className="flex flex-col gap-2">
            <button
              onClick={() => {
                onClose();
                onRecalibrate();
              }}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#171c2b] hover:bg-[#20273c] border border-orange-500/40 text-amber-200 font-bold font-ninja transition-all cursor-pointer active:scale-95"
            >
              <RefreshCw className="w-4 h-4 text-orange-400" />
              <span>Recalibrar Perfil Shinobi</span>
            </button>

            <div className="flex items-center gap-2 text-[10px] text-slate-400 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
              <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>
                <b>Privacidade garantida:</b> As imagens da câmera e landmarks são processados 100% localmente no seu dispositivo.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
