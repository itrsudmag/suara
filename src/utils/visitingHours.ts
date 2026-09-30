/**
 * Visiting Hours (Jam Besuk) Scheduler for RSUD Majenang
 * Configurable with LocalStorage Persistence
 * 
 * Default Schedules:
 * - Senin - Sabtu:
 *   - Buka Pagi: 10:30 WIB
 *   - Tutup Pagi: 12:30 WIB
 *   - Buka Sore: 16:30 WIB
 *   - Tutup Sore: 19:30 WIB
 * - Minggu:
 *   - Buka: 10:00 WIB
 *   - Tutup: 17:00 WIB
 */

export interface VisitingSession {
  id: string;
  name: string;
  dayType: 'weekday' | 'sunday';
  type: 'open' | 'close';
  time: string; // HH:MM
  description: string;
  script: string;
}

export const VISITING_OPEN_SCRIPT =
  `Perhatian kepada seluruh pengunjung RSUD Majenang. Kami informasikan bahwa waktu berkunjung atau jam besuk pasien telah dibuka. Demi kenyamanan, kesembuhan, dan keselamatan pasien, kami mengimbau kepada seluruh pengunjung untuk selalu menjaga ketertiban dan ketenangan di area ruang perawatan, membatasi jumlah pengunjung di dalam kamar secara bergantian, serta tidak membawa anak-anak di bawah usia 12 tahun ke area perawatan. Atas perhatian dan kerja sama Bapak, Ibu, serta Saudara sekalian, kami ucapkan terima kasih.`;

export const VISITING_CLOSE_SCRIPT =
  `Perhatian kepada seluruh pengunjung RSUD Majenang. Kami informasikan bahwa waktu berkunjung atau jam besuk pasien untuk sesi ini telah habis. Demi kenyamanan, ketenangan, serta waktu istirahat yang optimal bagi seluruh pasien, kami mengimbau kepada para pengunjung yang tidak berkepentingan untuk menjaga pasien agar segera meninggalkan area ruang perawatan dengan tertib. Bagi keluarga yang bertugas menjaga pasien, mohon untuk selalu menggunakan kartu pengunjung yang sah. Atas perhatian, pengertian, dan kerja sama Anda, kami ucapkan terima kasih.`;

export const DEFAULT_VISITING_SESSIONS: VisitingSession[] = [
  // Senin - Sabtu
  {
    id: 'weekday-open-morning',
    name: 'Buka Pagi (Senin - Sabtu)',
    dayType: 'weekday',
    type: 'open',
    time: '10:30',
    description: 'Sesi Besuk Pagi Hari Kerja',
    script: VISITING_OPEN_SCRIPT,
  },
  {
    id: 'weekday-close-morning',
    name: 'Tutup Pagi (Senin - Sabtu)',
    dayType: 'weekday',
    type: 'close',
    time: '12:30',
    description: 'Batas Akhir Sesi Pagi',
    script: VISITING_CLOSE_SCRIPT,
  },
  {
    id: 'weekday-open-afternoon',
    name: 'Buka Sore (Senin - Sabtu)',
    dayType: 'weekday',
    type: 'open',
    time: '16:30',
    description: 'Sesi Besuk Sore Hari Kerja',
    script: VISITING_OPEN_SCRIPT,
  },
  {
    id: 'weekday-close-afternoon',
    name: 'Tutup Sore (Senin - Sabtu)',
    dayType: 'weekday',
    type: 'close',
    time: '19:30',
    description: 'Batas Akhir Sesi Sore',
    script: VISITING_CLOSE_SCRIPT,
  },
  // Minggu
  {
    id: 'sunday-open',
    name: 'Buka Hari Minggu',
    dayType: 'sunday',
    type: 'open',
    time: '10:00',
    description: 'Sesi Besuk Hari Minggu / Libur',
    script: VISITING_OPEN_SCRIPT,
  },
  {
    id: 'sunday-close',
    name: 'Tutup Hari Minggu',
    dayType: 'sunday',
    type: 'close',
    time: '17:00',
    description: 'Batas Akhir Sesi Minggu / Libur',
    script: VISITING_CLOSE_SCRIPT,
  },
];

const STORAGE_KEY = 'RSUD_MAJENANG_VISITING_SESSIONS_V1';

/**
 * Loads sessions from localStorage or returns default
 */
export function getStoredVisitingSessions(): VisitingSession[] {
  if (typeof window === 'undefined') return DEFAULT_VISITING_SESSIONS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_VISITING_SESSIONS;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_VISITING_SESSIONS;
    
    // Merge with defaults to ensure all keys and scripts are intact
    return DEFAULT_VISITING_SESSIONS.map((def) => {
      const found = parsed.find((p: any) => p.id === def.id);
      return found && found.time ? { ...def, time: found.time } : def;
    });
  } catch (err) {
    console.warn('Failed to parse stored visiting hours, using defaults:', err);
    return DEFAULT_VISITING_SESSIONS;
  }
}

/**
 * Saves sessions to localStorage
 */
export function saveStoredVisitingSessions(sessions: VisitingSession[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  } catch (err) {
    console.error('Failed to save visiting sessions:', err);
  }
}

/**
 * Resets visiting hours to RSUD Majenang defaults
 */
export function resetStoredVisitingSessions(): VisitingSession[] {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY);
  }
  return DEFAULT_VISITING_SESSIONS;
}

/**
 * Backwards compatibility export
 */
export const VISITING_SESSIONS = DEFAULT_VISITING_SESSIONS;

/**
 * Returns the relevant sessions for today based on day of week
 * 0 = Sunday, 1-6 = Monday - Saturday
 */
export function getTodayVisitingSessions(
  date: Date = new Date(),
  customSessions?: VisitingSession[]
): VisitingSession[] {
  const isSunday = date.getDay() === 0;
  const sessions = customSessions || getStoredVisitingSessions();
  return sessions.filter((s) => (isSunday ? s.dayType === 'sunday' : s.dayType === 'weekday'));
}

/**
 * Determines current status (Is visiting open right now?) and next event
 */
export function getVisitingStatus(
  date: Date = new Date(),
  customSessions?: VisitingSession[]
): {
  isOpenNow: boolean;
  currentStatusText: string;
  nextSession: VisitingSession | null;
  diffSeconds: number;
} {
  const allSessions = customSessions || getStoredVisitingSessions();
  const todaySessions = getTodayVisitingSessions(date, allSessions);
  const nowSec = date.getHours() * 3600 + date.getMinutes() * 60 + date.getSeconds();

  let isOpenNow = false;
  const isSunday = date.getDay() === 0;

  if (isSunday) {
    const sundayOpen = todaySessions.find((s) => s.type === 'open');
    const sundayClose = todaySessions.find((s) => s.type === 'close');
    if (sundayOpen && sundayClose) {
      const [oH, oM] = sundayOpen.time.split(':').map(Number);
      const [cH, cM] = sundayClose.time.split(':').map(Number);
      const openSec = oH * 3600 + oM * 60;
      const closeSec = cH * 3600 + cM * 60;
      if (nowSec >= openSec && nowSec < closeSec) {
        isOpenNow = true;
      }
    }
  } else {
    // Weekday morning & afternoon
    const mOpen = todaySessions.find((s) => s.id === 'weekday-open-morning');
    const mClose = todaySessions.find((s) => s.id === 'weekday-close-morning');
    const aOpen = todaySessions.find((s) => s.id === 'weekday-open-afternoon');
    const aClose = todaySessions.find((s) => s.id === 'weekday-close-afternoon');

    if (mOpen && mClose) {
      const [oH, oM] = mOpen.time.split(':').map(Number);
      const [cH, cM] = mClose.time.split(':').map(Number);
      if (nowSec >= oH * 3600 + oM * 60 && nowSec < cH * 3600 + cM * 60) {
        isOpenNow = true;
      }
    }

    if (aOpen && aClose) {
      const [oH, oM] = aOpen.time.split(':').map(Number);
      const [cH, cM] = aClose.time.split(':').map(Number);
      if (nowSec >= oH * 3600 + oM * 60 && nowSec < cH * 3600 + cM * 60) {
        isOpenNow = true;
      }
    }
  }

  // Find next event today
  for (const s of todaySessions) {
    const [h, m] = s.time.split(':').map(Number);
    const sSec = h * 3600 + m * 60;
    if (sSec > nowSec) {
      return {
        isOpenNow,
        currentStatusText: isOpenNow ? 'Jam Besuk Sedang Berlangsung' : 'Bukan Jam Besuk (Waktu Istirahat Pasien)',
        nextSession: s,
        diffSeconds: sSec - nowSec,
      };
    }
  }

  // Next session is tomorrow morning
  const tomorrow = new Date(date);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowIsSunday = tomorrow.getDay() === 0;
  const tomorrowSessions = allSessions.filter((s) =>
    tomorrowIsSunday ? s.dayType === 'sunday' : s.dayType === 'weekday'
  );
  const nextTomorrowSession = tomorrowSessions[0] || DEFAULT_VISITING_SESSIONS[0];
  const [nextH, nextM] = nextTomorrowSession.time.split(':').map(Number);
  const nextTomorrowSec = (24 * 3600 - nowSec) + (nextH * 3600 + nextM * 60);

  return {
    isOpenNow: false,
    currentStatusText: 'Bukan Jam Besuk (Waktu Istirahat Pasien)',
    nextSession: nextTomorrowSession,
    diffSeconds: nextTomorrowSec,
  };
}
