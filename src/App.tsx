import React, { useState, useEffect, useRef } from 'react';
import {
  Volume2,
  Play,
  Square,
  Sparkles,
  Download,
  RotateCcw,
  Sliders,
  Building2,
  Bell,
  Radio,
  FileText,
  Clock,
  CheckCircle2,
  Copy,
  Wand2,
  Headphones,
  Loader2,
  AlertTriangle,
  HeartPulse,
  Flame,
  Activity,
  Baby,
  Bomb,
  CloudLightning,
  MapPin,
  Calendar,
  Car,
} from 'lucide-react';
import {
  HOSPITAL_PRESETS,
  HOSPITAL_DEFAULT_SCRIPT,
  HospitalPreset,
} from './data/hospitalData';
import { VOICE_PROFILES, VoiceProfile } from './data/voiceProfiles';
import { EMERGENCY_CODES, EmergencyCode } from './data/emergencyCodes';
import {
  getAudioContext,
  createHospitalChimeBuffer,
  createEmergencyAlertBuffer,
  decodeBase64ToAudioBuffer,
  concatenateAudioBuffers,
  audioBufferToWav,
  applyAcousticEffect,
} from './utils/audioEngine';
import {
  calculateMajenangPrayerTimes,
  getNextPrayer,
  PrayerTimeSchedule,
  MAJENANG_COORDS,
} from './utils/prayerTimes';
import { AudioVisualizer } from './components/AudioVisualizer';
import { VoiceAnalysisCard } from './components/VoiceAnalysisCard';
import { AiScriptGeneratorModal } from './components/AiScriptGeneratorModal';
import { ModelParametersInfo } from './components/ModelParametersInfo';
import { AdzanSchedulerCard } from './components/AdzanSchedulerCard';
import { EmergencyCodePanel } from './components/EmergencyCodePanel';
import { VisitingHoursSchedulerCard } from './components/VisitingHoursSchedulerCard';
import { VehicleCallModal } from './components/VehicleCallModal';
import { getVisitingStatus } from './utils/visitingHours';
import { SuaraLogo } from './components/SuaraLogo';

export default function App() {
  // Text & synthesis state
  const [announcementText, setAnnouncementText] = useState(HOSPITAL_DEFAULT_SCRIPT);
  const [selectedVoice, setSelectedVoice] = useState('Kore'); // Kore = Larasati (calibrated female alto voice)
  const [tempo, setTempo] = useState(0.90); // 0.90x = 106-108 WPM exact reference calibration
  const [selectedChimeType, setSelectedChimeType] = useState<'hospital' | 'emergency' | 'none'>('hospital');
  const [includeIntroChime, setIncludeIntroChime] = useState(true);
  const [includeOutroChime, setIncludeOutroChime] = useState(true);
  const [acousticRoom, setAcousticRoom] = useState<'clean' | 'hospital_ward' | 'station_hall'>('hospital_ward');
  const [selectedPresetId, setSelectedPresetId] = useState('rs-visit-end');

  // Prayer times state (Majenang, Cilacap)
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [prayerSchedule, setPrayerSchedule] = useState<PrayerTimeSchedule>(() =>
    calculateMajenangPrayerTimes(new Date())
  );
  const [nextPrayerInfo, setNextPrayerInfo] = useState(() =>
    getNextPrayer(calculateMajenangPrayerTimes(new Date()), new Date())
  );

  // Playback & Processing State
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackStage, setPlaybackStage] = useState<'idle' | 'chime_intro' | 'speech' | 'chime_outro'>('idle');
  const [downloadBlob, setDownloadBlob] = useState<Blob | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'studio' | 'visiting' | 'emergency' | 'adzan' | 'analysis' | 'params'>('studio');
  const [visitingStatus, setVisitingStatus] = useState(() => getVisitingStatus(new Date()));
  const [isScriptModalOpen, setIsScriptModalOpen] = useState(false);
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [copiedText, setCopiedText] = useState(false);

  // References
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const speechUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Clock tick & prayer schedule update
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);
      const sched = calculateMajenangPrayerTimes(now);
      setPrayerSchedule(sched);
      setNextPrayerInfo(getNextPrayer(sched, now));
      setVisitingStatus(getVisitingStatus(now));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      if (downloadUrl) {
        URL.revokeObjectURL(downloadUrl);
      }
      stopPlayback();
    };
  }, [downloadUrl]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3800);
  };

  const stopPlayback = () => {
    if (currentSourceRef.current) {
      try {
        currentSourceRef.current.stop();
      } catch (e) {}
      currentSourceRef.current = null;
    }
    if (window.speechSynthesis && window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }
    setIsPlaying(false);
    setPlaybackStage('idle');
  };

  const getChimeBuffer = (ctx: AudioContext, stage: 'intro' | 'outro'): AudioBuffer | null => {
    if (selectedChimeType === 'none') return null;
    if (selectedChimeType === 'emergency') {
      return stage === 'intro' ? createEmergencyAlertBuffer(ctx) : null;
    }
    return createHospitalChimeBuffer(ctx, stage);
  };

  // Fallback Web Speech Synthesis if backend TTS fails or offline
  const playFallbackWebSpeech = async (text: string) => {
    const ctx = getAudioContext();
    audioContextRef.current = ctx;

    try {
      setIsPlaying(true);

      // Intro Chime
      if (includeIntroChime && selectedChimeType !== 'none') {
        const introBuf = getChimeBuffer(ctx, 'intro');
        if (introBuf) {
          setPlaybackStage('chime_intro');
          await playBufferSync(ctx, introBuf);
        }
      }

      // Speech
      setPlaybackStage('speech');
      await new Promise<void>((resolve) => {
        if (!('speechSynthesis' in window)) {
          resolve();
          return;
        }

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'id-ID';
        utterance.rate = tempo * 0.95;
        utterance.pitch = 1.0;

        const voices = window.speechSynthesis.getVoices();
        const indonesianVoice = voices.find(
          (v) => v.lang.startsWith('id') || v.name.toLowerCase().includes('indonesia')
        );
        if (indonesianVoice) {
          utterance.voice = indonesianVoice;
        }

        utterance.onend = () => resolve();
        utterance.onerror = () => resolve();
        speechUtteranceRef.current = utterance;
        window.speechSynthesis.speak(utterance);
      });

      // Outro Chime
      if (includeOutroChime && selectedChimeType !== 'none' && selectedChimeType !== 'emergency') {
        const outroBuf = getChimeBuffer(ctx, 'outro');
        if (outroBuf) {
          setPlaybackStage('chime_outro');
          await playBufferSync(ctx, outroBuf);
        }
      }

      setPlaybackStage('idle');
      setIsPlaying(false);
    } catch (err) {
      console.error('Playback error:', err);
      stopPlayback();
    }
  };

  const playBufferSync = (ctx: AudioContext, buffer: AudioBuffer): Promise<void> => {
    return new Promise((resolve) => {
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      currentSourceRef.current = source;
      source.onended = () => resolve();
      source.start();
    });
  };

  // Main Synthesize & Play
  const handleSynthesizeAndPlay = async () => {
    if (isPlaying) {
      stopPlayback();
      return;
    }

    if (!announcementText.trim()) {
      showToast('Silakan masukkan naskah pengumuman terlebih dahulu.');
      return;
    }

    setIsLoadingAudio(true);
    const ctx = getAudioContext();
    audioContextRef.current = ctx;

    const stylePrompt =
      'Warm, compassionate, calm, formal Indonesian hospital announcer and medical information voice. Gentle, soothing, clear enunciation with respectful pauses.';

    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: announcementText,
          voiceName: selectedVoice,
          tempo: tempo,
          style: stylePrompt,
        }),
      });

      if (!res.ok) {
        setIsLoadingAudio(false);
        showToast('Memutar suara dengan mesin lokal & Bel Pengumuman RS.');
        await playFallbackWebSpeech(announcementText);
        return;
      }

      const data = await res.json();
      if (!data.audioBase64) {
        throw new Error('Tidak ada data audio dari model.');
      }

      const speechBuffer = await decodeBase64ToAudioBuffer(ctx, data.audioBase64);

      // Assemble Chimes and Speech
      const buffersToMerge: AudioBuffer[] = [];
      if (includeIntroChime && selectedChimeType !== 'none') {
        const introBuf = getChimeBuffer(ctx, 'intro');
        if (introBuf) buffersToMerge.push(introBuf);
      }

      buffersToMerge.push(speechBuffer);

      if (includeOutroChime && selectedChimeType !== 'none' && selectedChimeType !== 'emergency') {
        const outroBuf = getChimeBuffer(ctx, 'outro');
        if (outroBuf) buffersToMerge.push(outroBuf);
      }

      const fullBuffer = concatenateAudioBuffers(ctx, buffersToMerge, 0.40);
      const finalMasterBuffer = applyAcousticEffect(ctx, fullBuffer, acousticRoom);

      const wavBlob = audioBufferToWav(finalMasterBuffer);
      const url = URL.createObjectURL(wavBlob);
      if (downloadUrl) URL.revokeObjectURL(downloadUrl);
      setDownloadBlob(wavBlob);
      setDownloadUrl(url);

      setIsLoadingAudio(false);
      setIsPlaying(true);
      setPlaybackStage(includeIntroChime && selectedChimeType !== 'none' ? 'chime_intro' : 'speech');

      const source = ctx.createBufferSource();
      source.buffer = finalMasterBuffer;
      source.connect(ctx.destination);
      currentSourceRef.current = source;

      source.onended = () => {
        setIsPlaying(false);
        setPlaybackStage('idle');
      };

      source.start();
      showToast('Audio pengumuman berhasil disintesis dengan Gemini TTS!');
    } catch (err: any) {
      console.error('Error synthesizing audio:', err);
      setIsLoadingAudio(false);
      showToast('Menggunakan mesin pemutaran lokal & Bel RS.');
      await playFallbackWebSpeech(announcementText);
    }
  };

  const handleDownloadWav = () => {
    if (!downloadBlob || !downloadUrl) {
      showToast('Silakan sintesis dan putar audio terlebih dahulu untuk mengunduh.');
      return;
    }
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `SUARA_RSUD_Majenang_${selectedVoice}_${Date.now()}.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleSelectHospitalPreset = (preset: HospitalPreset) => {
    setSelectedPresetId(preset.id);
    setAnnouncementText(preset.textIndonesian);
    setSelectedChimeType(preset.chimeType);
    showToast(`Naskah RS "${preset.categoryLabel}" dimuat.`);
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(announcementText);
    setCopiedText(true);
    showToast('Teks pengumuman berhasil disalin!');
    setTimeout(() => setCopiedText(false), 2000);
  };

  // Direct trigger for emergency code from panel or buttons
  const handleBroadcastEmergency = (script: string, codeName: string) => {
    setAnnouncementText(script);
    setSelectedChimeType('emergency');
    setActiveTab('studio');
    showToast(`Kode Kedaruratan ${codeName} dimuat ke Studio Siaran!`);
  };

  const wordCount = announcementText.trim() ? announcementText.trim().split(/\s+/).length : 0;
  const estimatedSeconds =
    Math.round((wordCount / (110 * tempo)) * 60) +
    (includeIntroChime && selectedChimeType !== 'none' ? 4 : 0) +
    (includeOutroChime && selectedChimeType !== 'none' ? 4 : 0);

  const prayerItems = [
    { name: 'Imsak', time: prayerSchedule.imsak },
    { name: 'Subuh', time: prayerSchedule.subuh },
    { name: 'Terbit', time: prayerSchedule.terbit },
    { name: 'Dzuhur', time: prayerSchedule.dzuhur },
    { name: 'Ashar', time: prayerSchedule.ashar },
    { name: 'Maghrib', time: prayerSchedule.maghrib },
    { name: 'Isya', time: prayerSchedule.isya },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl text-white font-medium text-xs sm:text-sm shadow-2xl backdrop-blur border bg-emerald-700/90 border-emerald-400/40 animate-in slide-in-from-bottom duration-300">
          <Sparkles className="w-4 h-4 text-emerald-200" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header with Official Logo */}
      <header className="border-b border-slate-800/80 bg-slate-900/80 backdrop-blur sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-4">
          {/* Logo Branding */}
          <SuaraLogo size="md" />

          {/* Navigation Tabs */}
          <div className="flex items-center bg-slate-950/90 p-1 rounded-xl border border-slate-800 text-xs flex-wrap">
            <button
              onClick={() => setActiveTab('studio')}
              className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'studio'
                  ? 'bg-emerald-600 text-white shadow-sm font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              Studio Siaran
            </button>

            <button
              onClick={() => setActiveTab('visiting')}
              className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'visiting'
                  ? 'bg-emerald-600 text-white shadow-sm font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-teal-400" />
              <span>Otomatisasi Jam Besuk</span>
              <span className={`w-1.5 h-1.5 rounded-full ${visitingStatus.isOpenNow ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            </button>

            <button
              onClick={() => setActiveTab('emergency')}
              className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'emergency'
                  ? 'bg-red-600 text-white shadow-sm font-semibold'
                  : 'text-red-400 hover:text-white'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>5 Kode Darurat</span>
            </button>

            <button
              onClick={() => setActiveTab('adzan')}
              className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer flex items-center gap-1.5 relative ${
                activeTab === 'adzan'
                  ? 'bg-emerald-600 text-white shadow-sm font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              <span>Jadwal & Adzan Majenang</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </button>

            <button
              onClick={() => setActiveTab('analysis')}
              className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'analysis'
                  ? 'bg-emerald-600 text-white shadow-sm font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Headphones className="w-3.5 h-3.5" />
              Karakteristik Suara
            </button>

            <button
              onClick={() => setActiveTab('params')}
              className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'params'
                  ? 'bg-emerald-600 text-white shadow-sm font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              Parameter Prompt
            </button>
          </div>
        </div>
      </header>

      {/* Prominent Prayer Times & Visiting Status Bar: Majenang, Cilacap */}
      <section className="bg-gradient-to-r from-slate-900 via-emerald-950/40 to-slate-900 border-b border-emerald-500/20 px-4 sm:px-6 py-2.5">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
              <MapPin className="w-3.5 h-3.5" /> Majenang, Cilacap
            </span>
            <span className="text-slate-600">|</span>
            <span className="font-mono text-white bg-slate-950 px-2 py-0.5 rounded border border-slate-800 font-bold">
              {currentTime.toLocaleTimeString('id-ID', { hour12: false })} WIB
            </span>

            {/* Jam Besuk Status Badge */}
            <button
              onClick={() => setActiveTab('visiting')}
              className={`px-2.5 py-0.5 rounded-full font-semibold border flex items-center gap-1.5 transition cursor-pointer ${
                visitingStatus.isOpenNow
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 hover:bg-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/50 hover:bg-amber-500/30'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${visitingStatus.isOpenNow ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              <span>Jam Besuk: <strong>{visitingStatus.isOpenNow ? 'DIBUKA' : 'TUTUP'}</strong></span>
            </button>

            <span className="text-slate-400 hidden lg:inline">
              Berikutnya: <strong className="text-emerald-300">{nextPrayerInfo.name}</strong> ({nextPrayerInfo.timeStr} WIB)
            </span>
          </div>

          {/* Quick Schedule Badges */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-1">
            {prayerItems.map((p) => {
              const isNext = nextPrayerInfo.name.toLowerCase().startsWith(p.name.toLowerCase());
              return (
                <div
                  key={p.name}
                  className={`px-2 py-0.5 rounded-md font-mono text-[11px] flex items-center gap-1 border transition ${
                    isNext
                      ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 font-bold ring-1 ring-emerald-500/30'
                      : 'bg-slate-950/70 border-slate-800/80 text-slate-300'
                  }`}
                >
                  <span className="text-[10px] text-slate-400 font-sans">{p.name}</span>
                  <span>{p.time}</span>
                </div>
              );
            })}

            <button
              onClick={() => setActiveTab('adzan')}
              className="text-[11px] text-emerald-400 hover:text-emerald-300 underline font-medium ml-1 cursor-pointer"
            >
              Atur Adzan Otomatis
            </button>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 space-y-6">
        {/* Top Emergency Quick Access Strip */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 sm:p-4 shadow-xl flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              Siaga Kedaruratan RSUD Majenang:
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {EMERGENCY_CODES.map((code) => (
              <button
                key={code.id}
                onClick={() => handleBroadcastEmergency(code.templateScript(code.defaultLocation), code.badge)}
                className={`px-2.5 py-1.5 rounded-lg border text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${code.colorBg} ${code.colorBorder} ${code.textColor}`}
              >
                <span>{code.badge}</span>
              </button>
            ))}

            <button
              onClick={() => setActiveTab('emergency')}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition cursor-pointer"
            >
              Kelola Lokasi & Rincian →
            </button>
          </div>
        </div>

        {/* Tab 1: Studio Siaran */}
        {activeTab === 'studio' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Script Editor & Hospital Presets (7 cols) */}
            <div className="lg:col-span-7 space-y-5">
              {/* Presets Bar */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl">
                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-emerald-400" />
                    Template Siaran Rumah Sakit (RSUD Majenang)
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsVehicleModalOpen(true)}
                      className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 transition cursor-pointer"
                    >
                      <Car className="w-3.5 h-3.5" />
                      Panggil Pindah Kendaraan
                    </button>
                    <button
                      onClick={() => setIsScriptModalOpen(true)}
                      className="text-xs font-medium text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
                    >
                      <Wand2 className="w-3.5 h-3.5" />
                      Buat dengan AI
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {HOSPITAL_PRESETS.map((preset) => {
                    const isSelected = selectedPresetId === preset.id;
                    return (
                      <button
                        key={preset.id}
                        onClick={() => handleSelectHospitalPreset(preset)}
                        className={`text-left p-2.5 rounded-xl border transition-all text-xs cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'bg-emerald-500/15 border-emerald-500/60 text-white shadow-sm ring-1 ring-emerald-500/30'
                            : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-900/80'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold truncate text-[11px] text-emerald-300">
                              {preset.categoryLabel}
                            </span>
                            {preset.id === 'rs-adzan-majenang' && (
                              <span className="text-[9px] bg-emerald-500 text-white font-bold px-1 py-0.2 rounded">
                                Adzan
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] line-clamp-1 text-slate-200">
                            {preset.title}
                          </p>
                        </div>
                        <span className="text-[10px] text-slate-400 mt-2 block">
                          {preset.location}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Textarea Editor */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Naskah Siaran Audio RSUD Majenang
                    </label>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCopyText}
                      className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 px-2 py-1 rounded hover:bg-slate-800 transition cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      {copiedText ? 'Tersalin' : 'Salin Teks'}
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <textarea
                    value={announcementText}
                    onChange={(e) => setAnnouncementText(e.target.value)}
                    rows={8}
                    placeholder="Tuliskan naskah pengumuman rumah sakit di sini..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 leading-relaxed font-normal resize-y"
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 mt-3 pt-3 border-t border-slate-800/80 gap-2">
                  <div className="flex items-center gap-3">
                    <span>
                      <strong className="text-slate-200">{wordCount}</strong> kata
                    </span>
                    <span>•</span>
                    <span>
                      <strong className="text-slate-200">{announcementText.length}</strong> karakter
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-cyan-400" />
                      Est. Durasi: <strong className="text-slate-200">~{estimatedSeconds}s</strong>
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-400">
                    Saran: Gunakan tanda koma (,) untuk jeda napas 450ms
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Voice Persona, Chime & Controls (5 cols) */}
            <div className="lg:col-span-5 space-y-5">
              {/* Voice Persona Picker */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Volume2 className="w-4 h-4 text-emerald-400" />
                    Karakter Suara AI RSUD Majenang
                  </h3>
                  <span className="text-[10px] text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-800 font-medium">
                    Gemini TTS 24kHz
                  </span>
                </div>

                <div className="space-y-2">
                  {VOICE_PROFILES.map((profile) => {
                    const isSelected = selectedVoice === profile.voiceName;
                    return (
                      <div
                        key={profile.id}
                        onClick={() => {
                          setSelectedVoice(profile.voiceName);
                          setTempo(profile.recommendedTempo);
                        }}
                        className={`p-3 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-500/15 border-emerald-500/60 ring-1 ring-emerald-500/40 text-white'
                            : 'bg-slate-950/60 border-slate-800/80 text-slate-300 hover:border-slate-700 hover:bg-slate-900/60'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-xs text-white">
                              {profile.name}
                            </span>
                            {profile.isReferenceMatch && (
                              <span className="text-[9px] bg-emerald-600 text-white font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                                Model Utama
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-400">
                            {profile.gender === 'female' ? 'Wanita' : 'Pria'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          {profile.description}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {/* Tempo Slider */}
                <div className="pt-2 border-t border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-300 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      Tempo Bicara: <strong className="text-emerald-300 font-semibold">{tempo.toFixed(2)}x</strong>
                    </span>
                    <button
                      onClick={() => setTempo(0.90)}
                      className={`text-[10px] px-2 py-0.5 rounded transition cursor-pointer ${
                        tempo === 0.90
                          ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/40'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      Reset 0.90x (Standar Santun)
                    </button>
                  </div>

                  <input
                    type="range"
                    min="0.75"
                    max="1.25"
                    step="0.01"
                    value={tempo}
                    onChange={(e) => setTempo(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-800 accent-emerald-500 rounded-lg cursor-pointer"
                  />

                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>Tenang (0.75x)</span>
                    <span className="text-emerald-400 font-semibold">108 WPM (Optimal Ruang Rawat)</span>
                    <span>Cepat (1.25x)</span>
                  </div>
                </div>

                {/* Chime & Room Acoustics */}
                <div className="pt-2 border-t border-slate-800/80 space-y-3">
                  <span className="text-xs font-medium text-slate-300 block flex items-center gap-1.5">
                    <Bell className="w-3.5 h-3.5 text-emerald-400" />
                    Pilihan Nada Bel Pengumuman
                  </span>

                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <button
                      onClick={() => setSelectedChimeType('hospital')}
                      className={`py-2 px-2 rounded-xl border text-center transition cursor-pointer ${
                        selectedChimeType === 'hospital'
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-semibold ring-1 ring-emerald-500/30'
                          : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <span className="block text-[11px] font-semibold">🔔 Bel RS</span>
                      <span className="text-[9px] text-slate-400 block mt-0.5 truncate">universfield-chime</span>
                    </button>

                    <button
                      onClick={() => setSelectedChimeType('emergency')}
                      className={`py-2 px-2 rounded-xl border text-center transition cursor-pointer ${
                        selectedChimeType === 'emergency'
                          ? 'bg-red-500/20 border-red-500 text-red-300 font-semibold ring-1 ring-red-500/30'
                          : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <span className="block text-[11px] font-semibold">🚨 Alarm Darurat</span>
                      <span className="text-[9px] text-slate-400 block mt-0.5 truncate">olenchic--154922</span>
                    </button>

                    <button
                      onClick={() => setSelectedChimeType('none')}
                      className={`py-2 px-2 rounded-xl border text-center transition cursor-pointer ${
                        selectedChimeType === 'none'
                          ? 'bg-slate-800 border-slate-600 text-slate-200 font-semibold'
                          : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <span className="block text-[11px] font-semibold">🔇 Tanpa Bel</span>
                      <span className="text-[9px] text-slate-400 block mt-0.5">Hanya Suara</span>
                    </button>
                  </div>

                  {/* Room Acoustics Selection */}
                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-400">Suasana Akustik Ruang:</label>
                    <div className="grid grid-cols-3 gap-1.5 text-[11px]">
                      <button
                        onClick={() => setAcousticRoom('hospital_ward')}
                        className={`py-1.5 px-2 rounded-lg border text-center transition cursor-pointer ${
                          acousticRoom === 'hospital_ward'
                            ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-semibold'
                            : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        Bangsal / Koridor RS
                      </button>
                      <button
                        onClick={() => setAcousticRoom('clean')}
                        className={`py-1.5 px-2 rounded-lg border text-center transition cursor-pointer ${
                          acousticRoom === 'clean'
                            ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-semibold'
                            : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        Studio Jernih
                      </button>
                      <button
                        onClick={() => setAcousticRoom('station_hall')}
                        className={`py-1.5 px-2 rounded-lg border text-center transition cursor-pointer ${
                          acousticRoom === 'station_hall'
                            ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-semibold'
                            : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        Lobby / Hall Luas
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Master Audio Controller Card */}
              <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-emerald-500/40 rounded-2xl p-5 shadow-2xl relative">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${isPlaying ? 'bg-emerald-400 animate-ping' : 'bg-slate-600'}`} />
                    <span className="text-xs font-semibold text-white uppercase tracking-wider">
                      Status Audio Player
                    </span>
                  </div>

                  {playbackStage !== 'idle' && (
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-full border bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
                      {playbackStage === 'chime_intro' && '🔔 Membunyikan Bel Pembuka...'}
                      {playbackStage === 'speech' && '🎙️ Menyuarakan Pengumuman...'}
                      {playbackStage === 'chime_outro' && '🔔 Membunyikan Bel Penutup...'}
                    </span>
                  )}
                </div>

                {/* Waveform Visualizer */}
                <div className="mb-4">
                  <AudioVisualizer isPlaying={isPlaying} />
                </div>

                {/* Primary Action Buttons */}
                <div className="space-y-2">
                  <button
                    onClick={handleSynthesizeAndPlay}
                    disabled={isLoadingAudio}
                    className={`w-full py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2.5 shadow-xl transition-all cursor-pointer ${
                      isPlaying
                        ? 'bg-red-600 hover:bg-red-700 text-white shadow-red-600/30'
                        : 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-700 text-white shadow-emerald-600/30 hover:shadow-emerald-600/40'
                    }`}
                  >
                    {isLoadingAudio ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Mensintesis Suara Pengumuman RS...
                      </>
                    ) : isPlaying ? (
                      <>
                        <Square className="w-5 h-5 fill-current" />
                        Hentikan Siaran (Stop)
                      </>
                    ) : (
                      <>
                        <Play className="w-5 h-5 fill-current" />
                        Putar Pengumuman RSUD Majenang
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleDownloadWav}
                    disabled={!downloadBlob}
                    className="w-full py-2.5 rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200 font-medium text-xs flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-emerald-400" />
                    Unduh Berkas Audio WAV (Lengkap dengan Nada Bel)
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Otomatisasi Jam Besuk Pasien RSUD Majenang */}
        {activeTab === 'visiting' && (
          <div className="space-y-6">
            <VisitingHoursSchedulerCard
              onLoadScriptToStudio={(script) => {
                setAnnouncementText(script);
                setSelectedChimeType('hospital');
                setActiveTab('studio');
                showToast('Naskah jam besuk dimuat ke Studio Siaran!');
              }}
              onBroadcastNow={(script, label) => {
                setAnnouncementText(script);
                setSelectedChimeType('hospital');
                setActiveTab('studio');
                showToast(`Memutar siaran "${label}" di Studio!`);
              }}
              onScheduleUpdated={() => {
                setVisitingStatus(getVisitingStatus(new Date()));
              }}
            />
          </div>
        )}

        {/* Tab 3: 5 Kode Kedaruratan RSUD Majenang */}
        {activeTab === 'emergency' && (
          <EmergencyCodePanel
            onBroadcast={handleBroadcastEmergency}
            onLoadToStudio={(script) => {
              setAnnouncementText(script);
              setSelectedChimeType('emergency');
              setActiveTab('studio');
              showToast('Naskah kode kedaruratan dimuat ke Studio Siaran!');
            }}
          />
        )}

        {/* Tab 3: Jadwal & Pemutaran Adzan Otomatis Majenang */}
        {activeTab === 'adzan' && (
          <div className="space-y-6">
            <AdzanSchedulerCard
              hospitalName="RSUD Majenang"
              musholaLocation="Lantai 1 Sayap Barat & Area Masjid RSUD"
              onAnnounceText={(text) => {
                setAnnouncementText(text);
                setSelectedPresetId('rs-adzan-majenang');
                setActiveTab('studio');
                showToast('Naskah pengumuman adzan dimuat ke Studio!');
              }}
            />
          </div>
        )}

        {/* Tab 4: Karakteristik Suara */}
        {activeTab === 'analysis' && (
          <div className="space-y-6">
            <VoiceAnalysisCard
              currentTempo={tempo}
              currentVoice={selectedVoice}
              hasIntroChime={includeIntroChime}
              hasOutroChime={includeOutroChime}
            />

            {/* Comparison Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-emerald-400" />
                    Penerapan Model Suara pada RSUD Majenang
                  </h4>
                  <span className="text-[10px] text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                    Hospital Adapted
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                  Model suara ini dikalibrasi presisi dengan karakter vokal santun, berwibawa, intonasi teratur, dan tempo tenang (108 WPM). Karakteristik ini <strong>sangat ideal untuk RSUD Majenang</strong> karena:
                </p>
                <ul className="text-xs text-slate-300 space-y-2 mt-3 leading-relaxed">
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">•</span>
                    <span><strong>Menenangkan Pasien:</strong> Tidak menggunakan intonasi melengking atau tergesa-gesa yang dapat mengejutkan pasien sakit jantung atau ruang intensif (ICU/NICU).</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">•</span>
                    <span><strong>Artikulasi Tajam:</strong> Pasien lanjut usia dan keluarga dapat dengan mudah mendengar nomor antrean obat di apotek atau poliklinik.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">•</span>
                    <span><strong>Bel Soothing:</strong> Bel 3 not lembut (F5-A5-C6) menarik perhatian tanpa mengagetkan.</span>
                  </li>
                </ul>
              </div>

              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    Kategori Pengumuman SUARA RSUD Majenang
                  </h4>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="bg-slate-950/50 p-2.5 rounded-lg border border-slate-800">
                    <strong className="text-emerald-400 block mb-0.5">1. Jam Besuk & Waktu Istirahat Pasien</strong>
                    <span className="text-slate-400">Pengumuman pembukaan dan penutupan jam kunjungan pasien rawat inap.</span>
                  </div>
                  <div className="bg-slate-950/50 p-2.5 rounded-lg border border-slate-800">
                    <strong className="text-emerald-400 block mb-0.5">2. Kawasan Tanpa Rokok (KTR 100%)</strong>
                    <span className="text-slate-400">Penegakan larangan merokok dan rokok elektrik di seluruh area rumah sakit.</span>
                  </div>
                  <div className="bg-slate-950/50 p-2.5 rounded-lg border border-slate-800">
                    <strong className="text-emerald-400 block mb-0.5">3. Panggilan Antrean Poli & Loket Farmasi</strong>
                    <span className="text-slate-400">Pemanggilan pasien dan keluarga untuk konsultasi dokter serta pengambilan obat.</span>
                  </div>
                  <div className="bg-slate-950/50 p-2.5 rounded-lg border border-slate-800">
                    <strong className="text-red-400 block mb-0.5">4. 5 Kode Kedaruratan Resmi</strong>
                    <span className="text-slate-400">Code Red, Code Blue, Code Pink, Code Black, dan Code Grey.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 5: Parameter Prompt */}
        {activeTab === 'params' && (
          <div className="space-y-6">
            <ModelParametersInfo
              currentVoice={selectedVoice}
              currentTempo={tempo}
              acousticRoom={acousticRoom}
            />
          </div>
        )}
      </main>

      {/* AI Script Generator Modal */}
      <AiScriptGeneratorModal
        isOpen={isScriptModalOpen}
        onClose={() => setIsScriptModalOpen(false)}
        onApplyScript={(script) => {
          setAnnouncementText(script);
          showToast('Naskah pengumuman berhasil diterapkan ke studio!');
        }}
      />

      {/* Vehicle Relocation Call Modal */}
      <VehicleCallModal
        isOpen={isVehicleModalOpen}
        onClose={() => setIsVehicleModalOpen(false)}
        onApplyScript={(script) => {
          setAnnouncementText(script);
          setSelectedChimeType('hospital');
          showToast('Naskah panggilan pemindahan kendaraan diterapkan ke studio!');
        }}
      />

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-4 px-6 text-center text-xs text-slate-400 bg-slate-950">
        <p>
          SUARA RSUD Majenang • Sistem Utama Audio Rumah Sakit • Dikalibrasi presisi dengan karakter, intonasi, dan tempo resmi.
        </p>
      </footer>
    </div>
  );
}
