import React, { useState } from 'react';
import { Volume2, Sparkles, CheckCircle2, Sliders, Bell, Award, Square, Building2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { getAudioContext, createHospitalChimeBuffer, createEmergencyAlertBuffer } from '../utils/audioEngine';

interface VoiceAnalysisCardProps {
  currentTempo: number;
  currentVoice: string;
  hasIntroChime: boolean;
  hasOutroChime: boolean;
}

export const VoiceAnalysisCard: React.FC<VoiceAnalysisCardProps> = ({
  currentTempo,
  currentVoice,
  hasIntroChime,
  hasOutroChime,
}) => {
  const [activeSound, setActiveSound] = useState<string | null>(null);
  const [activeSource, setActiveSource] = useState<AudioBufferSourceNode | null>(null);

  const stopActiveSound = () => {
    if (activeSource) {
      try {
        activeSource.stop();
      } catch (e) {}
      setActiveSource(null);
    }
    setActiveSound(null);
  };

  const handlePlaySound = (type: 'hospital_chime' | 'emergency_code') => {
    try {
      if (activeSound === type) {
        stopActiveSound();
        return;
      }
      stopActiveSound();

      const ctx = getAudioContext();
      const buffer = type === 'hospital_chime'
        ? createHospitalChimeBuffer(ctx, 'intro')
        : createEmergencyAlertBuffer(ctx);

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);

      source.onended = () => {
        setActiveSound(null);
        setActiveSource(null);
      };

      source.start();
      setActiveSource(source);
      setActiveSound(type);
    } catch (err) {
      console.error('Play sound error:', err);
      stopActiveSound();
    }
  };

  const isTempoMatched = Math.abs(currentTempo - 0.90) <= 0.04;

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl backdrop-blur space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-sm">
            <Award className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-semibold text-white text-sm sm:text-base flex items-center gap-2">
              Karakteristik Model Suara SUARA RSUD Majenang
              <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                100% Calibrated
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Model suara wanita resmi: lembut, berwibawa, menenangkan pasien, dan artikulatif
            </p>
          </div>
        </div>

        {/* Chime Previews */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => handlePlaySound('hospital_chime')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
              activeSound === 'hospital_chime'
                ? 'bg-emerald-500 text-white border-emerald-400'
                : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/30'
            }`}
          >
            {activeSound === 'hospital_chime' ? (
              <Square className="w-3.5 h-3.5 fill-current" />
            ) : (
              <Bell className="w-3.5 h-3.5 text-emerald-400" />
            )}
            Uji Bel: universfield-attention-chime
          </button>

          <button
            onClick={() => handlePlaySound('emergency_code')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
              activeSound === 'emergency_code'
                ? 'bg-red-500 text-white border-red-400'
                : 'bg-red-500/20 text-red-300 border-red-500/30 hover:bg-red-500/30'
            }`}
          >
            {activeSound === 'emergency_code' ? (
              <Square className="w-3.5 h-3.5 fill-current" />
            ) : (
              <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
            )}
            Uji Sirine: olenchic--154922
          </button>
        </div>
      </div>

      {/* Grid of Key Voice Attributes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Karakter Suara */}
        <div className="bg-slate-950/60 rounded-xl p-3.5 border border-slate-800/60 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
              <span className="flex items-center gap-1.5 font-medium text-slate-300">
                <Volume2 className="w-3.5 h-3.5 text-emerald-400" /> Karakter Suara (Timbre)
              </span>
              <span className="text-[10px] bg-emerald-950 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-800">
                Wanita Formal & Empati
              </span>
            </div>
            <p className="text-xs text-slate-200 font-medium">
              Vokal Alto Lembut & Menenangkan
            </p>
            <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
              Frekuensi fundamental ~210 Hz, kehangatan intonasi petugas informasi RSUD Majenang (ramah, santun, tidak memicu kepanikan pada pasien).
            </p>
          </div>

          <div className="mt-3 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Target Voice:</span>
            <span className="text-emerald-400 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Voice Kore (Gemini TTS)
            </span>
          </div>
        </div>

        {/* Intonasi & Pacing */}
        <div className="bg-slate-950/60 rounded-xl p-3.5 border border-slate-800/60 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
              <span className="flex items-center gap-1.5 font-medium text-slate-300">
                <Sliders className="w-3.5 h-3.5 text-cyan-400" /> Intonasi & Jeda Napas
              </span>
              <span className="text-[10px] bg-cyan-950 text-cyan-300 px-1.5 py-0.5 rounded border border-cyan-800">
                Kadens RS Baku
              </span>
            </div>
            <p className="text-xs text-slate-200 font-medium">
              Mikro-Jeda Ritmik (450ms / 950ms)
            </p>
            <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
              Diksi baku terartikulasi jelas, memudahkan pasien dan penunggu mendengar nama panggilan atau nomor antrean tanpa multitafsir.
            </p>
          </div>

          <div className="mt-3 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Pemberian Jeda:</span>
            <span className="text-emerald-400 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Auto Prosody Punctuation
            </span>
          </div>
        </div>

        {/* Tempo */}
        <div className="bg-slate-950/60 rounded-xl p-3.5 border border-slate-800/60 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
              <span className="flex items-center gap-1.5 font-medium text-slate-300">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Kecepatan (Tempo)
              </span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded border ${isTempoMatched ? 'bg-emerald-950 text-emerald-300 border-emerald-800' : 'bg-amber-950 text-amber-300 border-amber-800'}`}>
                {isTempoMatched ? 'Presisi 100%' : 'Disesuaikan'}
              </span>
            </div>
            <p className="text-xs text-slate-200 font-medium">
              106-108 Kata/Menit (~0.90x)
            </p>
            <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
              Tempo tenang dan tidak terburu-buru, ideal untuk pengeras suara di koridor, poliklinik, dan ruang tunggu rawat inap RSUD Majenang.
            </p>
          </div>

          <div className="mt-3 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Kalibrasi:</span>
            <span className={`font-semibold ${isTempoMatched ? 'text-emerald-400' : 'text-amber-400'}`}>
              {currentTempo.toFixed(2)}x {isTempoMatched ? '✓ Match' : '(Standar: 0.90x)'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
