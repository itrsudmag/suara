import React, { useState, useEffect, useRef } from 'react';
import {
  Clock,
  Volume2,
  VolumeX,
  Play,
  Square,
  Sparkles,
  MapPin,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Radio,
  Sliders,
  Settings,
  Bell,
  Heart,
  Loader2,
} from 'lucide-react';
import {
  calculateMajenangPrayerTimes,
  getNextPrayer,
  PrayerTimeSchedule,
  MAJENANG_COORDS,
} from '../utils/prayerTimes';
import {
  getAudioContext,
  createHospitalChimeBuffer,
  decodeBase64ToAudioBuffer,
  concatenateAudioBuffers,
  audioBufferToWav,
} from '../utils/audioEngine';

// Reliable high-fidelity Adzan audio sources
const ADZAN_AUDIO_URLS = {
  regular: 'https://cdn.aladhan.com/audio/adhans/makkah.mp3',
  subuh: 'https://cdn.aladhan.com/audio/adhans/makkah_fajr.mp3',
};

interface AdzanSchedulerCardProps {
  hospitalName?: string;
  musholaLocation?: string;
  onAnnounceText?: (text: string) => void;
}

export const AdzanSchedulerCard: React.FC<AdzanSchedulerCardProps> = ({
  hospitalName = 'RSUD Majenang',
  musholaLocation = 'Lantai 1 Sayap Barat & Area Masjid RSUD',
  onAnnounceText,
}) => {
  const [schedule, setSchedule] = useState<PrayerTimeSchedule>(() =>
    calculateMajenangPrayerTimes(new Date())
  );
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [nextPrayerInfo, setNextPrayerInfo] = useState(() =>
    getNextPrayer(calculateMajenangPrayerTimes(new Date()), new Date())
  );

  // Settings
  const [isAutoPlayEnabled, setIsAutoPlayEnabled] = useState(true);
  const [playPreAnnouncement, setPlayPreAnnouncement] = useState(true);
  const [preAnnounceMinutes, setPreAnnounceMinutes] = useState(2); // 2 mins before
  const [playAdzanAudio, setPlayAdzanAudio] = useState(true);
  const [includeHospitalChime, setIncludeHospitalChime] = useState(true);
  const [activePrayers, setActivePrayers] = useState<Record<string, boolean>>({
    Subuh: true,
    Dzuhur: true,
    Ashar: true,
    Maghrib: true,
    Isya: true,
  });
  const [volume, setVolume] = useState(0.85);

  // Playback state
  const [playbackState, setPlaybackState] = useState<'idle' | 'announcing' | 'chime' | 'adzan'>('idle');
  const [activeAudioSource, setActiveAudioSource] = useState<string | null>(null);

  // Audio elements
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const voiceSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const chimeSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const triggeredPrayersRef = useRef<Set<string>>(new Set());

  // Clock tick & countdown update every second
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);

      // Recalculate if day changed
      const currentSched = calculateMajenangPrayerTimes(now);
      setSchedule(currentSched);
      const nextP = getNextPrayer(currentSched, now);
      setNextPrayerInfo(nextP);

      // Check auto-trigger
      if (isAutoPlayEnabled) {
        checkAutoTrigger(now, currentSched);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [isAutoPlayEnabled, activePrayers, playPreAnnouncement, playAdzanAudio, preAnnounceMinutes]);

  // Clean audio on unmount
  useEffect(() => {
    return () => {
      stopAllAudio();
    };
  }, []);

  const stopAllAudio = () => {
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current.currentTime = 0;
      audioElementRef.current = null;
    }
    if (voiceSourceRef.current) {
      try {
        voiceSourceRef.current.stop();
      } catch (e) {}
      voiceSourceRef.current = null;
    }
    if (chimeSourceRef.current) {
      try {
        chimeSourceRef.current.stop();
      } catch (e) {}
      chimeSourceRef.current = null;
    }
    if (window.speechSynthesis && window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }
    setPlaybackState('idle');
    setActiveAudioSource(null);
  };

  // Helper to construct natural announcement text for a prayer
  const getAnnouncementTextForPrayer = (prayerName: string): string => {
    return `Perhatian-perhatian, kepada seluruh pasien, keluarga, dan pengunjung ${hospitalName} yang kami hormati. Sesaat lagi akan berkumandang adzan ${prayerName} untuk wilayah Majenang, Kabupaten Cilacap dan sekitarnya. Bagi Bapak dan Ibu yang hendak menunaikan ibadah sholat, mushola dan masjid rumah sakit terletak di ${musholaLocation}. Mari sejenak menghentikan aktivitas untuk menyambut panggilan sholat. Terima kasih.`;
  };

  // Checks if current time matches scheduled adzan or pre-announcement
  const checkAutoTrigger = (now: Date, currentSchedule: PrayerTimeSchedule) => {
    const prayerMap: Record<string, string> = {
      Subuh: currentSchedule.subuh,
      Dzuhur: currentSchedule.dzuhur,
      Ashar: currentSchedule.ashar,
      Maghrib: currentSchedule.maghrib,
      Isya: currentSchedule.isya,
    };

    const currentHour = now.getHours();
    const currentMin = now.getMinutes();
    const currentSec = now.getSeconds();
    const todayKey = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;

    for (const [pName, pTime] of Object.entries(prayerMap)) {
      if (!activePrayers[pName]) continue;

      const [pHour, pMin] = pTime.split(':').map(Number);
      const prayerTotalSec = pHour * 3600 + pMin * 60;
      const nowTotalSec = currentHour * 3600 + currentMin * 60 + currentSec;

      // 1. Pre-announcement trigger (e.g. 2 minutes before)
      if (playPreAnnouncement) {
        const announceTriggerSec = prayerTotalSec - preAnnounceMinutes * 60;
        const announceKey = `${todayKey}_${pName}_announce`;
        if (
          Math.abs(nowTotalSec - announceTriggerSec) <= 1 &&
          !triggeredPrayersRef.current.has(announceKey)
        ) {
          triggeredPrayersRef.current.add(announceKey);
          handlePlayPreAnnouncement(pName);
        }
      }

      // 2. Exact Adzan trigger
      const adzanKey = `${todayKey}_${pName}_adzan`;
      if (
        Math.abs(nowTotalSec - prayerTotalSec) <= 1 &&
        !triggeredPrayersRef.current.has(adzanKey)
      ) {
        triggeredPrayersRef.current.add(adzanKey);
        handlePlaySequence(pName);
      }
    }
  };

  // Plays pre-adzan Voice AI announcement
  const handlePlayPreAnnouncement = async (prayerName: string) => {
    stopAllAudio();
    setPlaybackState('announcing');
    setActiveAudioSource(`Pengumuman Menjelang ${prayerName}`);

    const text = getAnnouncementTextForPrayer(prayerName);
    if (onAnnounceText) {
      onAnnounceText(text);
    }

    const ctx = getAudioContext();

    try {
      // Step 1: Gentle Hospital Chime
      if (includeHospitalChime) {
        const chimeBuf = createHospitalChimeBuffer(ctx, 'intro');
        const source = ctx.createBufferSource();
        source.buffer = chimeBuf;
        source.connect(ctx.destination);
        chimeSourceRef.current = source;
        await new Promise<void>((res) => {
          source.onended = () => res();
          source.start();
        });
      }

      // Step 2: Speech
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          voiceName: 'Kore',
          tempo: 0.90,
          style:
            'Warm, compassionate, calm, formal Indonesian hospital announcer and medical information voice. Gentle, soothing, clear enunciation with respectful pauses.',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.audioBase64) {
          const speechBuf = await decodeBase64ToAudioBuffer(ctx, data.audioBase64);
          const source = ctx.createBufferSource();
          source.buffer = speechBuf;
          source.connect(ctx.destination);
          voiceSourceRef.current = source;
          await new Promise<void>((res) => {
            source.onended = () => res();
            source.start();
          });
        }
      } else {
        // Fallback Web Speech
        await playSpeechFallback(text);
      }
    } catch (err) {
      console.warn('Pre-announcement fallback:', err);
      await playSpeechFallback(text);
    } finally {
      setPlaybackState('idle');
      setActiveAudioSource(null);
    }
  };

  // Plays Adzan audio
  const handlePlayAdzanAudio = (prayerName: string): Promise<void> => {
    return new Promise((resolve) => {
      setPlaybackState('adzan');
      setActiveAudioSource(`Adzan ${prayerName} Merdu`);

      const audioUrl = prayerName.toLowerCase().includes('subuh')
        ? ADZAN_AUDIO_URLS.subuh
        : ADZAN_AUDIO_URLS.regular;

      const audio = new Audio(audioUrl);
      audio.volume = volume;
      audioElementRef.current = audio;

      audio.onended = () => {
        setPlaybackState('idle');
        setActiveAudioSource(null);
        resolve();
      };

      audio.onerror = () => {
        console.warn('Adzan audio stream failed, playing peaceful chime resolution');
        setPlaybackState('idle');
        setActiveAudioSource(null);
        resolve();
      };

      audio.play().catch((e) => {
        console.warn('Autoplay audio blocked or error:', e);
        setPlaybackState('idle');
        setActiveAudioSource(null);
        resolve();
      });
    });
  };

  // Full Sequence: Pre-announcement -> Chime -> Full Adzan
  const handlePlaySequence = async (prayerName: string) => {
    stopAllAudio();
    // 1. Announcement
    if (playPreAnnouncement) {
      await handlePlayPreAnnouncement(prayerName);
    }
    // 2. Adzan
    if (playAdzanAudio) {
      await handlePlayAdzanAudio(prayerName);
    }
  };

  const playSpeechFallback = (text: string): Promise<void> => {
    return new Promise((resolve) => {
      if (!('speechSynthesis' in window)) {
        resolve();
        return;
      }
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'id-ID';
      u.rate = 0.88;
      u.pitch = 1.0;
      u.onend = () => resolve();
      u.onerror = () => resolve();
      window.speechSynthesis.speak(u);
    });
  };

  // Format countdown string
  const formatCountdown = (totalSec: number) => {
    if (totalSec <= 0) return 'Sedang Waktu Sholat';
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    if (h > 0) {
      return `${h} jam ${m} mnt ${s} dtk`;
    }
    return `${m} menit ${s} detik`;
  };

  const prayersList = [
    { key: 'imsak', name: 'Imsak', time: schedule.imsak, isPrayer: false },
    { key: 'subuh', name: 'Subuh', time: schedule.subuh, isPrayer: true },
    { key: 'terbit', name: 'Terbit', time: schedule.terbit, isPrayer: false },
    { key: 'dzuhur', name: 'Dzuhur', time: schedule.dzuhur, isPrayer: true },
    { key: 'ashar', name: 'Ashar', time: schedule.ashar, isPrayer: true },
    { key: 'maghrib', name: 'Maghrib', time: schedule.maghrib, isPrayer: true },
    { key: 'isya', name: 'Isya', time: schedule.isya, isPrayer: true },
  ];

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-2xl backdrop-blur space-y-5">
      {/* Top Banner & Location */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-600/20">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-white text-base">
                Jadwal Sholat & Pemutaran Adzan Otomatis
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Standar Kemenag RI (+2m Ihtiyat)
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
              <span className="flex items-center gap-1 text-emerald-400 font-medium">
                <MapPin className="w-3.5 h-3.5" /> {MAJENANG_COORDS.name}
              </span>
              <span>•</span>
              <span className="font-mono text-slate-300">
                {currentTime.toLocaleTimeString('id-ID', { hour12: false })} WIB
              </span>
            </div>
          </div>
        </div>

        {/* Next Prayer Countdown Card */}
        <div className="bg-slate-950/80 border border-emerald-500/30 rounded-xl px-3.5 py-2 flex items-center gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-slate-400">
              Sholat Berikutnya:
            </div>
            <div className="text-sm font-bold text-emerald-400 flex items-center gap-1.5">
              <span>{nextPrayerInfo.name}</span>
              <span className="text-white font-mono">({nextPrayerInfo.timeStr} WIB)</span>
            </div>
          </div>
          <div className="pl-3 border-l border-slate-800 text-right">
            <div className="text-[10px] text-slate-400">Menuju Waktu:</div>
            <div className="text-xs font-semibold text-amber-300 font-mono">
              {formatCountdown(nextPrayerInfo.diffSeconds)}
            </div>
          </div>
        </div>
      </div>

      {/* Prayer Times Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
        {prayersList.map((item) => {
          const isNext = nextPrayerInfo.name.toLowerCase().startsWith(item.name.toLowerCase());
          const isEnabled = item.isPrayer ? activePrayers[item.name] : true;

          return (
            <div
              key={item.key}
              className={`p-3 rounded-xl border flex flex-col justify-between transition-all ${
                isNext
                  ? 'bg-emerald-500/15 border-emerald-500 ring-1 ring-emerald-500/40 text-white shadow-lg shadow-emerald-500/10'
                  : 'bg-slate-950/60 border-slate-800/80 text-slate-300'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-slate-200">{item.name}</span>
                  {isNext && (
                    <span className="text-[9px] bg-emerald-500 text-white font-bold px-1 py-0.2 rounded">
                      Berikutnya
                    </span>
                  )}
                </div>
                <div className="text-lg font-bold font-mono text-emerald-300">
                  {item.time}
                </div>
                <span className="text-[10px] text-slate-400 block">WIB (Majenang)</span>
              </div>

              {item.isPrayer && (
                <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                  <button
                    onClick={() => handlePlaySequence(item.name)}
                    disabled={playbackState !== 'idle'}
                    title={`Uji putar pengumuman dan adzan ${item.name}`}
                    className="p-1 rounded bg-slate-800 hover:bg-emerald-600 hover:text-white text-slate-300 transition text-[10px] flex items-center gap-1 cursor-pointer disabled:opacity-40"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>Uji</span>
                  </button>

                  <label className="flex items-center gap-1 text-[10px] text-slate-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={activePrayers[item.name]}
                      onChange={(e) =>
                        setActivePrayers((prev) => ({
                          ...prev,
                          [item.name]: e.target.checked,
                        }))
                      }
                      className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-400 w-3 h-3 bg-slate-950"
                    />
                    <span>Otomatis</span>
                  </label>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Automation Controls & Settings */}
      <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className={`w-3 h-3 rounded-full ${isAutoPlayEnabled ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
            <div>
              <span className="text-xs font-semibold text-white uppercase tracking-wider block">
                Status Otomatisasi Pemutaran Adzan Majenang
              </span>
              <span className="text-[11px] text-slate-400">
                {isAutoPlayEnabled
                  ? 'Sistem siaga memutar pengumuman dan adzan sesuai jadwal Kemenag'
                  : 'Otomatisasi dijeda (Manual mode)'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsAutoPlayEnabled(!isAutoPlayEnabled)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                isAutoPlayEnabled
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              }`}
            >
              {isAutoPlayEnabled ? '✓ Otomatis Aktif' : 'Aktifkan Otomatis'}
            </button>

            {playbackState !== 'idle' && (
              <button
                onClick={stopAllAudio}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-500 text-white transition flex items-center gap-1 cursor-pointer"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                Hentikan Audio
              </button>
            )}
          </div>
        </div>

        {/* Feature Switches */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-800/80 text-xs">
          <label className="flex items-start gap-2 p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 cursor-pointer">
            <input
              type="checkbox"
              checked={playPreAnnouncement}
              onChange={(e) => setPlayPreAnnouncement(e.target.checked)}
              className="mt-0.5 rounded border-slate-700 text-emerald-500 focus:ring-emerald-400 w-3.5 h-3.5 bg-slate-950"
            />
            <div>
              <span className="font-semibold text-slate-200 block text-xs">Pengumuman Suara AI</span>
              <span className="text-[11px] text-slate-400 block mt-0.5">
                Pengumuman santun {preAnnounceMinutes} menit sebelum adzan berkumandang
              </span>
            </div>
          </label>

          <label className="flex items-start gap-2 p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 cursor-pointer">
            <input
              type="checkbox"
              checked={playAdzanAudio}
              onChange={(e) => setPlayAdzanAudio(e.target.checked)}
              className="mt-0.5 rounded border-slate-700 text-emerald-500 focus:ring-emerald-400 w-3.5 h-3.5 bg-slate-950"
            />
            <div>
              <span className="font-semibold text-slate-200 block text-xs">Audio Adzan Penuh</span>
              <span className="text-[11px] text-slate-400 block mt-0.5">
                Memutar adzan merdu Makkah/Madinah tepat pada waktu sholat
              </span>
            </div>
          </label>

          <label className="flex items-start gap-2 p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 cursor-pointer">
            <input
              type="checkbox"
              checked={includeHospitalChime}
              onChange={(e) => setIncludeHospitalChime(e.target.checked)}
              className="mt-0.5 rounded border-slate-700 text-emerald-500 focus:ring-emerald-400 w-3.5 h-3.5 bg-slate-950"
            />
            <div>
              <span className="font-semibold text-slate-200 block text-xs">Bel RS Lembut (Chime)</span>
              <span className="text-[11px] text-slate-400 block mt-0.5">
                Membunyikan lonceng perhatian yang menenangkan sebelum suara
              </span>
            </div>
          </label>
        </div>

        {/* Volume & Lead Time */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800/80">
          <div className="flex items-center gap-3">
            <Volume2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <div className="flex-1">
              <div className="flex justify-between text-xs text-slate-300 mb-1">
                <span>Volume Adzan & Siaran:</span>
                <span className="font-mono text-emerald-300 font-semibold">{Math.round(volume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={volume}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setVolume(val);
                  if (audioElementRef.current) audioElementRef.current.volume = val;
                }}
                className="w-full h-1.5 bg-slate-800 accent-emerald-500 rounded-lg cursor-pointer"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Clock className="w-4 h-4 text-cyan-400 shrink-0" />
            <div className="flex-1">
              <div className="flex justify-between text-xs text-slate-300 mb-1">
                <span>Waktu Pengumuman Sebelum Adzan:</span>
                <span className="text-cyan-300 font-semibold">{preAnnounceMinutes} Menit Sebelum</span>
              </div>
              <select
                value={preAnnounceMinutes}
                onChange={(e) => setPreAnnounceMinutes(parseInt(e.target.value, 10))}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value={1}>1 Menit Sebelum Adzan</option>
                <option value={2}>2 Menit Sebelum Adzan (Rekomendasi Kemenag)</option>
                <option value={3}>3 Menit Sebelum Adzan</option>
                <option value={5}>5 Menit Sebelum Adzan</option>
              </select>
            </div>
          </div>
        </div>

        {/* Active playback notification */}
        {playbackState !== 'idle' && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
              <span className="text-xs font-medium text-emerald-300">
                Sedang Memutar: <strong>{activeAudioSource}</strong>
              </span>
            </div>
            <button
              onClick={stopAllAudio}
              className="text-xs text-red-400 hover:text-red-300 underline font-medium cursor-pointer"
            >
              Hentikan
            </button>
          </div>
        )}
      </div>

      {/* Announcement Preview */}
      <div className="bg-slate-950/50 rounded-xl p-3.5 border border-slate-800/80 text-xs text-slate-400 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-start gap-2">
          <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong className="text-slate-200">Format Suara AI Menjelang Adzan:</strong> Menggunakan suara resmi wanita alto dengan salam santun RSUD Majenang, informasi lokasi mushola, dan himbauan sejenak menghentikan aktivitas.
          </p>
        </div>
        <button
          onClick={() => handlePlayPreAnnouncement('Dzuhur')}
          disabled={playbackState !== 'idle'}
          className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 transition text-xs shrink-0 cursor-pointer disabled:opacity-40"
        >
          Tes Pengumuman Adzan
        </button>
      </div>
    </div>
  );
};
