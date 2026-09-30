import React, { useState } from 'react';
import {
  Flame,
  Activity,
  Baby,
  Bomb,
  CloudLightning,
  AlertTriangle,
  Play,
  Square,
  Copy,
  Radio,
  MapPin,
  Check,
  Sparkles,
  Volume2,
} from 'lucide-react';
import { EMERGENCY_CODES, EmergencyCode } from '../data/emergencyCodes';
import { getAudioContext, createEmergencyAlertBuffer } from '../utils/audioEngine';

interface EmergencyCodePanelProps {
  onBroadcast: (script: string, codeName: string) => void;
  onLoadToStudio: (script: string) => void;
  isBroadcasting?: boolean;
}

export const EmergencyCodePanel: React.FC<EmergencyCodePanelProps> = ({
  onBroadcast,
  onLoadToStudio,
  isBroadcasting = false,
}) => {
  const [selectedCode, setSelectedCode] = useState<EmergencyCode>(EMERGENCY_CODES[0]);
  const [customLocation, setCustomLocation] = useState('Ruang Rawat Inap Melati Lantai 2');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const quickLocations = [
    'Ruang Melati Lantai 3',
    'Ruang Mawar Lantai 2',
    'Ruang Perinatologi Lantai 1',
    'Instalasi Gawat Darurat (IGD)',
    'Ruang ICU / HCU',
    'Instalasi Farmasi',
    'Lobby Utama & Pendaftaran',
    'Gedung Poliklinik Lantai 2',
    'Gedung Penunjang Medik',
  ];

  const currentScript = selectedCode.id === 'code-grey'
    ? selectedCode.templateScript()
    : selectedCode.templateScript(customLocation);

  const handleCopy = (code: EmergencyCode) => {
    const text = code.id === 'code-grey' ? code.templateScript() : code.templateScript(customLocation);
    navigator.clipboard.writeText(text);
    setCopiedId(code.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getCodeIcon = (id: string) => {
    switch (id) {
      case 'code-red':
        return <Flame className="w-5 h-5 text-red-400" />;
      case 'code-blue':
        return <Activity className="w-5 h-5 text-blue-400" />;
      case 'code-pink':
        return <Baby className="w-5 h-5 text-pink-400" />;
      case 'code-black':
        return <Bomb className="w-5 h-5 text-slate-300" />;
      case 'code-grey':
        return <CloudLightning className="w-5 h-5 text-zinc-300" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-amber-400" />;
    }
  };

  return (
    <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-5 shadow-2xl backdrop-blur space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center font-bold text-sm border border-red-500/30">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              Sistem 5 Kode Kedaruratan RSUD Majenang
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-500/20 text-red-300 border border-red-500/30">
                SOP Resmi
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Siaran darurat audio instan dengan nada alarm perhatian dan pelafalan resmi 3x pengulangan
            </p>
          </div>
        </div>
      </div>

      {/* Grid of 5 Emergency Codes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {EMERGENCY_CODES.map((code) => {
          const isSelected = selectedCode.id === code.id;
          return (
            <button
              key={code.id}
              onClick={() => setSelectedCode(code)}
              className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                isSelected
                  ? `${code.colorBg} ${code.colorBorder} ring-2 ring-white/20 shadow-lg scale-[1.02]`
                  : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center border border-slate-800">
                    {getCodeIcon(code.id)}
                  </div>
                  <span className={`text-[11px] font-black uppercase tracking-wider ${code.textColor}`}>
                    {code.name}
                  </span>
                </div>
                <div className="text-xs font-bold text-white mb-1">
                  {code.title}
                </div>
                <p className="text-[11px] text-slate-400 leading-tight">
                  {code.description}
                </p>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                <span className={isSelected ? 'text-white font-bold' : 'text-slate-400'}>
                  {isSelected ? '✓ Terpilih' : 'Pilih'}
                </span>
                <span className="text-[10px] text-slate-400">3x Panggilan</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Code Details & Location Input */}
      <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-4.5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className={`text-xs font-black px-2.5 py-1 rounded-lg border ${selectedCode.colorBg} ${selectedCode.colorBorder} ${selectedCode.textColor}`}>
              {selectedCode.badge} — {selectedCode.title}
            </span>
            <span className="text-xs text-slate-400">
              Format Naskah Kedaruratan Resmi RSUD Majenang
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleCopy(selectedCode)}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition text-xs flex items-center gap-1.5 cursor-pointer"
            >
              {copiedId === selectedCode.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedId === selectedCode.id ? 'Tersalin' : 'Salin Naskah'}</span>
            </button>

            <button
              onClick={() => onLoadToStudio(currentScript)}
              className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-white transition text-xs font-medium flex items-center gap-1.5 cursor-pointer"
            >
              <span>Buka di Studio Sintesis</span>
            </button>
          </div>
        </div>

        {/* Location Picker (Not needed for Code Grey which is hospital-wide) */}
        {selectedCode.id !== 'code-grey' && (
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-red-400" />
              Sebutkan Lokasi Kejadian (Area RSUD Majenang):
            </label>
            <div className="flex flex-wrap gap-1.5">
              {quickLocations.map((loc) => (
                <button
                  key={loc}
                  onClick={() => setCustomLocation(loc)}
                  className={`text-[11px] px-2.5 py-1 rounded-lg border transition cursor-pointer ${
                    customLocation === loc
                      ? 'bg-red-500/20 text-red-300 border-red-500/50 font-semibold'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {loc}
                </button>
              ))}
            </div>

            <input
              type="text"
              value={customLocation}
              onChange={(e) => setCustomLocation(e.target.value)}
              placeholder="Atau ketik lokasi spesifik, contoh: Ruang ICU Kamar 2B, Gedung Bersalin Lantai 1..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
            />
          </div>
        )}

        {/* Naskah Preview */}
        <div className="bg-slate-900/90 rounded-xl p-3.5 border border-slate-800/90 space-y-2">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Teks Siaran Suara AI yang akan Diudarakan:</span>
            <span className="text-emerald-400 font-mono text-[10px]">Artikulasi Tegas 108 WPM</span>
          </div>
          <p className="text-xs sm:text-sm text-slate-100 font-mono leading-relaxed bg-slate-950 p-3 rounded-lg border border-slate-800/80">
            {currentScript}
          </p>
        </div>

        {/* Broadcast Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            onClick={() => onBroadcast(currentScript, selectedCode.badge)}
            disabled={isBroadcasting}
            className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xl transition cursor-pointer ${
              selectedCode.id === 'code-red'
                ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-600/30'
                : selectedCode.id === 'code-blue'
                ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/30'
                : selectedCode.id === 'code-pink'
                ? 'bg-pink-600 hover:bg-pink-500 text-white shadow-pink-600/30'
                : selectedCode.id === 'code-black'
                ? 'bg-slate-700 hover:bg-slate-600 text-white shadow-slate-700/30'
                : 'bg-zinc-600 hover:bg-zinc-500 text-white shadow-zinc-600/30'
            }`}
          >
            <Radio className="w-4 h-4 animate-pulse" />
            <span>Siarkan Darurat: {selectedCode.badge}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
