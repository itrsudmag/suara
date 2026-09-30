import React, { useState, useEffect, useRef } from 'react';
import {
  Clock,
  DoorOpen,
  DoorClosed,
  Volume2,
  Play,
  Square,
  Sparkles,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Radio,
  Sliders,
  Bell,
  Copy,
  Check,
  Send,
  Edit3,
  RotateCcw,
  Save,
  Upload,
  AlertTriangle,
  Music,
} from 'lucide-react';
import {
  VISITING_OPEN_SCRIPT,
  VISITING_CLOSE_SCRIPT,
  getStoredVisitingSessions,
  saveStoredVisitingSessions,
  resetStoredVisitingSessions,
  getTodayVisitingSessions,
  getVisitingStatus,
  VisitingSession,
} from '../utils/visitingHours';
import {
  getAudioContext,
  createUniversfieldAttentionChimeBuffer,
  createOlenchicEmergencySirenBuffer,
  setCustomChimeBuffer,
  setCustomSirenBuffer,
  hasCustomChime,
  hasCustomSiren,
  decodeBase64ToAudioBuffer,
} from '../utils/audioEngine';

interface VisitingHoursSchedulerCardProps {
  onLoadScriptToStudio: (script: string) => void;
  onBroadcastNow: (script: string, label: string) => void;
  onScheduleUpdated?: () => void;
}

export const VisitingHoursSchedulerCard: React.FC<VisitingHoursSchedulerCardProps> = ({
  onLoadScriptToStudio,
  onBroadcastNow,
  onScheduleUpdated,
}) => {
  const [sessions, setSessions] = useState<VisitingSession[]>(() => getStoredVisitingSessions());
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [tempTime, setTempTime] = useState<string>('');
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [visitingStatus, setVisitingStatus] = useState(() => getVisitingStatus(new Date(), sessions));
  const [isAutoPlayEnabled, setIsAutoPlayEnabled] = useState(true);
  const [includeChime, setIncludeChime] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Audio testing state
  const [activeSoundTest, setActiveSoundTest] = useState<string | null>(null);
  const [customChimeName, setCustomChimeName] = useState<string | null>(null);
  const [customSirenName, setCustomSirenName] = useState<string | null>(null);

  const [sessionToggles, setSessionToggles] = useState<Record<string, boolean>>({
    'weekday-open-morning': true,
    'weekday-close-morning': true,
    'weekday-open-afternoon': true,
    'weekday-close-afternoon': true,
    'sunday-open': true,
    'sunday-close': true,
  });

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeSessionPlaying, setActiveSessionPlaying] = useState<string | null>(null);
  const [copiedType, setCopiedType] = useState<'open' | 'close' | null>(null);

  const activeSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const chimeSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const triggeredTimesRef = useRef<Set<string>>(new Set());

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Clock tick & schedule checking
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);
      const status = getVisitingStatus(now, sessions);
      setVisitingStatus(status);

      // Check auto trigger
      if (isAutoPlayEnabled) {
        checkAutoTrigger(now);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [isAutoPlayEnabled, sessionToggles, includeChime, sessions]);

  // Clean audio on unmount
  useEffect(() => {
    return () => {
      stopAudio();
    };
  }, []);

  const stopAudio = () => {
    if (activeSourceRef.current) {
      try {
        activeSourceRef.current.stop();
      } catch (e) {}
      activeSourceRef.current = null;
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
    setIsPlaying(false);
    setActiveSessionPlaying(null);
    setActiveSoundTest(null);
  };

  // Handle Editing Session Time
  const startEditing = (session: VisitingSession) => {
    setEditingSessionId(session.id);
    setTempTime(session.time);
  };

  const saveEditing = (sessionId: string) => {
    if (!tempTime || !tempTime.match(/^\d{1,2}:\d{2}$/)) {
      showToast('Format jam tidak valid. Gunakan format JJ:MM (misal: 10:30)');
      return;
    }

    const updated = sessions.map((s) => (s.id === sessionId ? { ...s, time: tempTime } : s));
    setSessions(updated);
    saveStoredVisitingSessions(updated);
    setEditingSessionId(null);
    setVisitingStatus(getVisitingStatus(currentTime, updated));
    showToast('Jadwal jam besuk berhasil diperbarui!');
    if (onScheduleUpdated) onScheduleUpdated();
  };

  const handleResetToDefault = () => {
    if (confirm('Kembalikan jadwal jam besuk ke standar RSUD Majenang?')) {
      const def = resetStoredVisitingSessions();
      setSessions(def);
      setEditingSessionId(null);
      setVisitingStatus(getVisitingStatus(currentTime, def));
      showToast('Jadwal jam besuk dikembalikan ke standar RSUD Majenang.');
      if (onScheduleUpdated) onScheduleUpdated();
    }
  };

  const checkAutoTrigger = (now: Date) => {
    const currentSessions = getTodayVisitingSessions(now, sessions);
    const nowHour = now.getHours();
    const nowMin = now.getMinutes();
    const nowSec = now.getSeconds();
    const todayKey = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;

    for (const session of currentSessions) {
      if (!sessionToggles[session.id]) continue;

      const [h, m] = session.time.split(':').map(Number);
      const sessionSec = h * 3600 + m * 60;
      const currentSec = nowHour * 3600 + nowMin * 60 + nowSec;

      const triggerKey = `${todayKey}_${session.id}_${session.time}`;
      if (Math.abs(currentSec - sessionSec) <= 1 && !triggeredTimesRef.current.has(triggerKey)) {
        triggeredTimesRef.current.add(triggerKey);
        playSessionAnnouncement(session);
      }
    }
  };

  const playSessionAnnouncement = async (session: VisitingSession) => {
    stopAudio();
    setIsPlaying(true);
    setActiveSessionPlaying(session.name);

    const ctx = getAudioContext();

    try {
      // 1. Play Universfield Attention Chime
      if (includeChime) {
        const chimeBuf = createUniversfieldAttentionChimeBuffer(ctx, 'intro');
        const source = ctx.createBufferSource();
        source.buffer = chimeBuf;
        source.connect(ctx.destination);
        chimeSourceRef.current = source;
        await new Promise<void>((resolve) => {
          source.onended = () => resolve();
          source.start();
        });
      }

      // 2. Play Voice AI Announcement
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: session.script,
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
          activeSourceRef.current = source;
          await new Promise<void>((resolve) => {
            source.onended = () => resolve();
            source.start();
          });
        }
      } else {
        await playWebSpeech(session.script);
      }

      // 3. Outro Chime
      if (includeChime) {
        const outroBuf = createUniversfieldAttentionChimeBuffer(ctx, 'outro');
        const source = ctx.createBufferSource();
        source.buffer = outroBuf;
        source.connect(ctx.destination);
        chimeSourceRef.current = source;
        await new Promise<void>((resolve) => {
          source.onended = () => resolve();
          source.start();
        });
      }
    } catch (err) {
      console.warn('Playback fallback:', err);
      await playWebSpeech(session.script);
    } finally {
      setIsPlaying(false);
      setActiveSessionPlaying(null);
    }
  };

  const playWebSpeech = (text: string): Promise<void> => {
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

  // Test Jingle Bel or Alarm Siren
  const testSound = async (type: 'universfield_chime' | 'olenchic_siren') => {
    if (activeSoundTest === type) {
      stopAudio();
      return;
    }
    stopAudio();
    setActiveSoundTest(type);

    const ctx = getAudioContext();
    const buffer =
      type === 'universfield_chime'
        ? createUniversfieldAttentionChimeBuffer(ctx, 'intro')
        : createOlenchicEmergencySirenBuffer(ctx, 4.8);

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.onended = () => setActiveSoundTest(null);
    activeSourceRef.current = source;
    source.start();
  };

  // Upload Custom Audio
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, target: 'chime' | 'siren') => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const ctx = getAudioContext();
      const arrayBuf = await file.arrayBuffer();
      const audioBuf = await ctx.decodeAudioData(arrayBuf);

      if (target === 'chime') {
        setCustomChimeBuffer(audioBuf);
        setCustomChimeName(file.name);
        showToast(`Berkas bel kustom "${file.name}" aktif!`);
      } else {
        setCustomSirenBuffer(audioBuf);
        setCustomSirenName(file.name);
        showToast(`Berkas sirine kustom "${file.name}" aktif!`);
      }
    } catch (err) {
      console.error('Failed to load audio file:', err);
      showToast('Gagal memproses berkas audio. Gunakan format MP3 atau WAV.');
    }
  };

  const formatCountdown = (totalSec: number) => {
    if (totalSec <= 0) return 'Tepat Saat Ini';
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    if (h > 0) {
      return `${h} jam ${m} mnt ${s} dtk`;
    }
    return `${m} menit ${s} detik`;
  };

  const isSunday = currentTime.getDay() === 0;

  const handleCopy = (type: 'open' | 'close') => {
    const text = type === 'open' ? VISITING_OPEN_SCRIPT : VISITING_CLOSE_SCRIPT;
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-2xl backdrop-blur space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-16 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl text-white font-medium text-xs shadow-2xl bg-emerald-700/95 border border-emerald-400/40 animate-in slide-in-from-top">
          <Sparkles className="w-4 h-4 text-emerald-200" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header & Status Card */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-600 to-emerald-500 flex items-center justify-center text-white shadow-lg shadow-teal-600/20">
            {visitingStatus.isOpenNow ? <DoorOpen className="w-5 h-5" /> : <DoorClosed className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-white text-base">
                Otomatisasi Siaran Jam Besuk Pasien RSUD Majenang
              </h3>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                visitingStatus.isOpenNow
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              }`}>
                {visitingStatus.isOpenNow ? 'JAM BESUK DIBUKA' : 'JAM BESUK TUTUP'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5 flex-wrap">
              <span>Hari Ini: <strong className="text-slate-200">{isSunday ? 'Minggu (Jadwal Khusus)' : 'Senin s/d Sabtu (Hari Kerja)'}</strong></span>
              <span>•</span>
              <span className="font-mono text-slate-300">
                {currentTime.toLocaleTimeString('id-ID', { hour12: false })} WIB
              </span>
            </div>
          </div>
        </div>

        {/* Countdown Badge */}
        {visitingStatus.nextSession && (
          <div className="bg-slate-950/80 border border-emerald-500/30 rounded-xl px-4 py-2 flex items-center gap-3">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-400">
                Siaran Jam Besuk Berikutnya:
              </div>
              <div className="text-sm font-bold text-emerald-400 flex items-center gap-1.5">
                <span>{visitingStatus.nextSession.name}</span>
                <span className="text-white font-mono">({visitingStatus.nextSession.time} WIB)</span>
              </div>
            </div>
            <div className="pl-3 border-l border-slate-800 text-right">
              <div className="text-[10px] text-slate-400">Menuju Siaran:</div>
              <div className="text-xs font-semibold text-amber-300 font-mono">
                {formatCountdown(visitingStatus.diffSeconds)}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Audio Jingle & Siren Calibration Strip */}
      <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
            Konfigurasi Audio Resmi:
          </span>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Universfield Attention Chime 123107 */}
          <div className="flex items-center gap-2 bg-slate-900 border border-emerald-500/30 px-3 py-1.5 rounded-lg text-xs">
            <Bell className="w-3.5 h-3.5 text-emerald-400" />
            <div className="flex flex-col">
              <span className="font-semibold text-white text-[11px]">
                Jingle Bel: <strong className="text-emerald-300">universfield-attention-chime-123107</strong>
              </span>
              {customChimeName && (
                <span className="text-[10px] text-emerald-400">✓ Berkas Kustom: {customChimeName}</span>
              )}
            </div>
            <button
              onClick={() => testSound('universfield_chime')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition cursor-pointer flex items-center gap-1 ${
                activeSoundTest === 'universfield_chime'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'
              }`}
            >
              {activeSoundTest === 'universfield_chime' ? <Square className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current" />}
              <span>Uji Bel</span>
            </button>
            <label className="text-[10px] text-slate-400 hover:text-white cursor-pointer px-1 py-0.5 rounded hover:bg-slate-800 flex items-center gap-0.5">
              <Upload className="w-3 h-3" />
              <input
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={(e) => handleFileUpload(e, 'chime')}
              />
            </label>
          </div>

          {/* Olenchic Siren 154922 */}
          <div className="flex items-center gap-2 bg-slate-900 border border-red-500/30 px-3 py-1.5 rounded-lg text-xs">
            <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
            <div className="flex flex-col">
              <span className="font-semibold text-white text-[11px]">
                Alarm Darurat: <strong className="text-red-300">olenchic--154922</strong>
              </span>
              {customSirenName && (
                <span className="text-[10px] text-red-400">✓ Berkas Kustom: {customSirenName}</span>
              )}
            </div>
            <button
              onClick={() => testSound('olenchic_siren')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition cursor-pointer flex items-center gap-1 ${
                activeSoundTest === 'olenchic_siren'
                  ? 'bg-red-600 text-white'
                  : 'bg-red-500/20 text-red-300 hover:bg-red-500/30'
              }`}
            >
              {activeSoundTest === 'olenchic_siren' ? <Square className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current" />}
              <span>Uji Sirine</span>
            </button>
            <label className="text-[10px] text-slate-400 hover:text-white cursor-pointer px-1 py-0.5 rounded hover:bg-slate-800 flex items-center gap-0.5">
              <Upload className="w-3 h-3" />
              <input
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={(e) => handleFileUpload(e, 'siren')}
              />
            </label>
          </div>
        </div>
      </div>

      {/* Main Automation Controller Bar */}
      <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`w-3.5 h-3.5 rounded-full ${isAutoPlayEnabled ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
          <div>
            <span className="text-xs font-bold text-white uppercase tracking-wider block">
              Sistem Otomatisasi Pemutaran Siaran Jam Besuk
            </span>
            <span className="text-[11px] text-slate-400">
              {isAutoPlayEnabled
                ? 'Sistem siaga memutar suara pembukaan dan penutupan jam besuk secara otomatis tepat waktu'
                : 'Otomatisasi dinonaktifkan (Mode Manual)'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
            <input
              type="checkbox"
              checked={includeChime}
              onChange={(e) => setIncludeChime(e.target.checked)}
              className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-400 w-3.5 h-3.5 bg-slate-950"
            />
            <span>Sertakan Bel universfield-attention-chime</span>
          </label>

          <button
            onClick={() => setIsAutoPlayEnabled(!isAutoPlayEnabled)}
            className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
              isAutoPlayEnabled
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
          >
            {isAutoPlayEnabled ? '✓ Otomatis Aktif' : 'Aktifkan Otomatis'}
          </button>

          <button
            onClick={handleResetToDefault}
            className="px-2.5 py-1.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-medium transition cursor-pointer flex items-center gap-1"
            title="Kembalikan semua jadwal ke default RSUD Majenang"
          >
            <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
            <span>Reset Jam Standar</span>
          </button>

          {isPlaying && (
            <button
              onClick={stopAudio}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-500 text-white transition flex items-center gap-1 cursor-pointer"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              Hentikan Siaran
            </button>
          )}
        </div>
      </div>

      {/* Grid: Jadwal Senin-Sabtu vs Minggu with Editable Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Senin s/d Sabtu */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              Jadwal Senin s/d Sabtu (Hari Kerja)
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400 italic">
                (Klik jam untuk mengedit)
              </span>
              {!isSunday && (
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded border border-emerald-500/30">
                  Jadwal Hari Ini
                </span>
              )}
            </div>
          </div>

          <div className="space-y-2.5">
            {sessions.filter((s) => s.dayType === 'weekday').map((session) => {
              const isEnabled = sessionToggles[session.id];
              const isEditing = editingSessionId === session.id;

              return (
                <div
                  key={session.id}
                  className={`p-3 rounded-xl border transition flex flex-wrap items-center justify-between gap-3 ${
                    session.type === 'open'
                      ? 'bg-emerald-950/20 border-emerald-500/30'
                      : 'bg-amber-950/20 border-amber-500/30'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                      session.type === 'open'
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-amber-500/20 text-amber-300'
                    }`}>
                      {session.type === 'open' ? <DoorOpen className="w-4 h-4" /> : <DoorClosed className="w-4 h-4" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-xs text-white">
                          {session.name}
                        </span>

                        {/* Editable Time Display / Input */}
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="time"
                              value={tempTime}
                              onChange={(e) => setTempTime(e.target.value)}
                              className="bg-slate-900 border border-emerald-500 rounded px-2 py-0.5 text-xs font-mono font-bold text-white focus:outline-none"
                            />
                            <button
                              onClick={() => saveEditing(session.id)}
                              className="p-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
                              title="Simpan Jam"
                            >
                              <Save className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => setEditingSessionId(null)}
                              className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                              title="Batal"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEditing(session)}
                            className="group font-mono text-xs font-bold text-emerald-300 bg-slate-900 hover:bg-slate-800 px-2 py-0.5 rounded border border-slate-800 hover:border-emerald-500/60 transition flex items-center gap-1 cursor-pointer"
                            title="Klik untuk mengubah jam"
                          >
                            <span>{session.time} WIB</span>
                            <Edit3 className="w-2.5 h-2.5 text-slate-500 group-hover:text-emerald-400" />
                          </button>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400 block mt-0.5">
                        {session.description}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => playSessionAnnouncement(session)}
                      disabled={isPlaying}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-emerald-600 hover:text-white text-slate-200 transition text-[11px] font-medium flex items-center gap-1 cursor-pointer disabled:opacity-40"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>Uji Putar</span>
                    </button>

                    <label className="flex items-center gap-1 text-[11px] text-slate-400 cursor-pointer ml-1">
                      <input
                        type="checkbox"
                        checked={isEnabled}
                        onChange={(e) =>
                          setSessionToggles((prev) => ({
                            ...prev,
                            [session.id]: e.target.checked,
                          }))
                        }
                        className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-400 w-3.5 h-3.5 bg-slate-950"
                      />
                      <span>Otomatis</span>
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Minggu / Hari Libur */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-cyan-400" />
              Jadwal Minggu / Hari Libur
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400 italic">
                (Klik jam untuk mengedit)
              </span>
              {isSunday && (
                <span className="text-[10px] bg-cyan-500/20 text-cyan-300 font-bold px-2 py-0.5 rounded border border-cyan-500/30">
                  Jadwal Hari Ini
                </span>
              )}
            </div>
          </div>

          <div className="space-y-2.5">
            {sessions.filter((s) => s.dayType === 'sunday').map((session) => {
              const isEnabled = sessionToggles[session.id];
              const isEditing = editingSessionId === session.id;

              return (
                <div
                  key={session.id}
                  className={`p-3 rounded-xl border transition flex flex-wrap items-center justify-between gap-3 ${
                    session.type === 'open'
                      ? 'bg-emerald-950/20 border-emerald-500/30'
                      : 'bg-amber-950/20 border-amber-500/30'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                      session.type === 'open'
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-amber-500/20 text-amber-300'
                    }`}>
                      {session.type === 'open' ? <DoorOpen className="w-4 h-4" /> : <DoorClosed className="w-4 h-4" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-xs text-white">
                          {session.name}
                        </span>

                        {/* Editable Time Display / Input */}
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="time"
                              value={tempTime}
                              onChange={(e) => setTempTime(e.target.value)}
                              className="bg-slate-900 border border-cyan-500 rounded px-2 py-0.5 text-xs font-mono font-bold text-white focus:outline-none"
                            />
                            <button
                              onClick={() => saveEditing(session.id)}
                              className="p-1 rounded bg-cyan-600 hover:bg-cyan-500 text-white cursor-pointer"
                              title="Simpan Jam"
                            >
                              <Save className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => setEditingSessionId(null)}
                              className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                              title="Batal"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEditing(session)}
                            className="group font-mono text-xs font-bold text-cyan-300 bg-slate-900 hover:bg-slate-800 px-2 py-0.5 rounded border border-slate-800 hover:border-cyan-500/60 transition flex items-center gap-1 cursor-pointer"
                            title="Klik untuk mengubah jam"
                          >
                            <span>{session.time} WIB</span>
                            <Edit3 className="w-2.5 h-2.5 text-slate-500 group-hover:text-cyan-400" />
                          </button>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400 block mt-0.5">
                        {session.description}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => playSessionAnnouncement(session)}
                      disabled={isPlaying}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-emerald-600 hover:text-white text-slate-200 transition text-[11px] font-medium flex items-center gap-1 cursor-pointer disabled:opacity-40"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>Uji Putar</span>
                    </button>

                    <label className="flex items-center gap-1 text-[11px] text-slate-400 cursor-pointer ml-1">
                      <input
                        type="checkbox"
                        checked={isEnabled}
                        onChange={(e) =>
                          setSessionToggles((prev) => ({
                            ...prev,
                            [session.id]: e.target.checked,
                          }))
                        }
                        className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-400 w-3.5 h-3.5 bg-slate-950"
                      />
                      <span>Otomatis</span>
                    </label>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400 leading-relaxed">
            💡 Jadwal jam besuk ini dapat diubah kapan saja sesuai kebijakan terbaru rumah sakit. Jam baru langsung tersimpan otomatis di perangkat dan memandu jadwal siaran otomatis.
          </div>
        </div>
      </div>

      {/* Official Scripts Viewer */}
      <div className="space-y-4 pt-2">
        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
          <Radio className="w-3.5 h-3.5 text-emerald-400" />
          Naskah Narasi Resmi Jam Besuk RSUD Majenang
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Narasi Jam Besuk Buka */}
          <div className="bg-slate-950/80 border border-emerald-500/30 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                <DoorOpen className="w-4 h-4" />
                Narasi 1: Jam Besuk Buka
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleCopy('open')}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] flex items-center gap-1 cursor-pointer transition"
                >
                  {copiedType === 'open' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedType === 'open' ? 'Tersalin' : 'Salin'}</span>
                </button>
                <button
                  onClick={() => onLoadScriptToStudio(VISITING_OPEN_SCRIPT)}
                  className="px-2.5 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-medium flex items-center gap-1 cursor-pointer transition"
                >
                  <Send className="w-3 h-3" />
                  <span>Buka di Studio</span>
                </button>
              </div>
            </div>

            <p className="text-xs text-slate-200 leading-relaxed bg-slate-900/80 p-3 rounded-lg border border-slate-800/80 font-normal">
              "{VISITING_OPEN_SCRIPT}"
            </p>

            <button
              onClick={() => onBroadcastNow(VISITING_OPEN_SCRIPT, 'Jam Besuk Buka')}
              className="w-full py-2 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 hover:text-white text-emerald-300 border border-emerald-500/30 text-xs font-medium transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>Putar Narasi Jam Besuk Buka Sekarang</span>
            </button>
          </div>

          {/* Narasi Jam Besuk Tutup */}
          <div className="bg-slate-950/80 border border-amber-500/30 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                <DoorClosed className="w-4 h-4" />
                Narasi 2: Jam Besuk Tutup
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleCopy('close')}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] flex items-center gap-1 cursor-pointer transition"
                >
                  {copiedType === 'close' ? <Check className="w-3 h-3 text-amber-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedType === 'close' ? 'Tersalin' : 'Salin'}</span>
                </button>
                <button
                  onClick={() => onLoadScriptToStudio(VISITING_CLOSE_SCRIPT)}
                  className="px-2.5 py-0.5 rounded bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-medium flex items-center gap-1 cursor-pointer transition"
                >
                  <Send className="w-3 h-3" />
                  <span>Buka di Studio</span>
                </button>
              </div>
            </div>

            <p className="text-xs text-slate-200 leading-relaxed bg-slate-900/80 p-3 rounded-lg border border-slate-800/80 font-normal">
              "{VISITING_CLOSE_SCRIPT}"
            </p>

            <button
              onClick={() => onBroadcastNow(VISITING_CLOSE_SCRIPT, 'Jam Besuk Tutup')}
              className="w-full py-2 rounded-lg bg-amber-600/20 hover:bg-amber-600 hover:text-white text-amber-300 border border-amber-500/30 text-xs font-medium transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>Putar Narasi Jam Besuk Tutup Sekarang</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
