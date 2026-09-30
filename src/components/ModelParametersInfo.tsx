import React from 'react';
import { Terminal, Copy, Check, Info, Cpu, Sparkles } from 'lucide-react';

interface ModelParametersInfoProps {
  currentVoice: string;
  currentTempo: number;
  acousticRoom: string;
}

export const ModelParametersInfo: React.FC<ModelParametersInfoProps> = ({
  currentVoice,
  currentTempo,
  acousticRoom,
}) => {
  const [copied, setCopied] = React.useState(false);

  const parameterSnippet = `// Parameter Konfigurasi Model Suara Pengumuman KAI
{
  "model": "gemini-3.8-flash-lite-tts",
  "voiceName": "${currentVoice}",
  "speechMetadata": {
    "style": "Warm, articulate, calm, formal Indonesian railway train announcer. Clear pronunciation, poised cadence, respectful Indonesian voice persona with natural pauses."
  },
  "acousticCalibration": {
    "targetWPM": 108,
    "tempoFactor": ${currentTempo.toFixed(2)},
    "commaPauseMs": 450,
    "periodPauseMs": 950,
    "ambientPreset": "${acousticRoom}",
    "chimeIntroOutro": "KAI 4-Phrase Resonant Bell Chime (Web Audio Synthesizer)"
  }
}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(parameterSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-orange-400" />
          <h4 className="text-sm font-semibold text-white">
            Spesifikasi Prompt & Parameter Arsitektur Suara
          </h4>
        </div>
        <button
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'Tersalin' : 'Salin Konfigurasi'}
        </button>
      </div>

      <p className="text-xs text-slate-400 mb-3 leading-relaxed">
        Model ini memanfaatkan Gemini Audio TTS dengan penyesuaian khusus pada <span className="text-orange-300 font-medium">speechMetadata style</span>, pemformatan tanda baca ritmik, dan kalkulasi durasi artikulasi vokal bahasa Indonesia.
      </p>

      <div className="relative rounded-xl overflow-hidden bg-slate-950 border border-slate-800/80 p-3.5">
        <pre className="text-[11px] font-mono text-cyan-300 leading-relaxed overflow-x-auto">
          {parameterSnippet}
        </pre>
      </div>

      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-400">
        <div className="flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>Intonasi nada dirancang khusus untuk dialek baku tanpa singkatan.</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>Output audio berkas WAV 24.000 Hz kualitas tinggi standar siaran.</span>
        </div>
      </div>
    </div>
  );
};
