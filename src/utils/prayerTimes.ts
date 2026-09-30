/**
 * Prayer Times Calculation Engine for Majenang, Cilacap, Jawa Tengah
 * Calibrated to standard Kementerian Agama Republik Indonesia (Kemenag RI) / Bimas Islam
 * Coordinates: Latitude -7.2975, Longitude 108.7619, Timezone: UTC+7 (WIB)
 */

export interface PrayerTimeSchedule {
  imsak: string;
  subuh: string;
  terbit: string;
  dzuhur: string;
  ashar: string;
  maghrib: string;
  isya: string;
  dateStr: string;
  location: string;
}

export const MAJENANG_COORDS = {
  name: 'Majenang, Kab. Cilacap, Jawa Tengah',
  latitude: -7.2975,
  longitude: 108.7619,
  timezone: 7, // UTC+7 (WIB)
  subuhAngle: 20.0, // Kemenag standard
  isyaAngle: 18.0,  // Kemenag standard
  ihtiyatMinutes: 2, // Kemenag standard safety buffer
};

// Trigonometric helpers in degrees
const rad = (deg: number) => (deg * Math.PI) / 180.0;
const deg = (rad: number) => (rad * 180.0) / Math.PI;

/**
 * Calculates Julian Date from JavaScript Date
 */
function getJulianDate(year: number, month: number, day: number): number {
  if (month <= 2) {
    year -= 1;
    month += 12;
  }
  const A = Math.floor(year / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + day + B - 1524.5;
}

/**
 * Calculates Solar Coordinates
 */
function getSunCoordinates(d: number) {
  const g = 357.529 + 0.98560028 * d;
  const q = 280.459 + 0.98564736 * d;
  const L = q + 1.915 * Math.sin(rad(g)) + 0.020 * Math.sin(rad(2 * g));

  const e = 23.439 - 0.00000036 * d;
  const RA = deg(Math.atan2(Math.cos(rad(e)) * Math.sin(rad(L)), Math.cos(rad(L)))) / 15;
  const dec = deg(Math.asin(Math.sin(rad(e)) * Math.sin(rad(L))));

  return { dec, RA, L, g };
}

/**
 * Calculates Equation of Time (in hours)
 */
function getEquationOfTime(d: number): number {
  const { RA, L } = getSunCoordinates(d);
  let eq = (L / 15) - RA;
  while (eq > 12) eq -= 24;
  while (eq < -12) eq += 24;
  return eq;
}

/**
 * Calculates Solar Declination
 */
function getDeclination(d: number): number {
  return getSunCoordinates(d).dec;
}

/**
 * Calculates Hour Angle for a given angle below/above horizon
 */
function getHourAngle(angle: number, dec: number, lat: number): number {
  const cosH = (Math.sin(rad(-angle)) - Math.sin(rad(lat)) * Math.sin(rad(dec))) /
               (Math.cos(rad(lat)) * Math.cos(rad(dec)));
  if (cosH > 1) return 0;
  if (cosH < -1) return 180;
  return deg(Math.acos(cosH));
}

/**
 * Calculates Ashar Hour Angle according to Shafi'i madhab
 */
function getAsharHourAngle(dec: number, lat: number): number {
  const shadowLength = 1; // Shafi'i shadow factor
  const noonAltitude = 90 - Math.abs(lat - dec);
  const asharAltitude = deg(Math.atan(1 / (shadowLength + Math.tan(rad(90 - noonAltitude)))));
  const cosH = (Math.sin(rad(asharAltitude)) - Math.sin(rad(lat)) * Math.sin(rad(dec))) /
               (Math.cos(rad(lat)) * Math.cos(rad(dec)));
  return deg(Math.acos(Math.max(-1, Math.min(1, cosH))));
}

/**
 * Converts fractional hours to HH:MM string with ihtiyat buffer
 */
function formatHoursToTime(hours: number, addMinutes: number = 0): string {
  let totalMin = Math.round(hours * 60) + addMinutes;
  while (totalMin < 0) totalMin += 1440;
  while (totalMin >= 1440) totalMin -= 1440;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Calculates offline official Kemenag prayer times for Majenang, Cilacap
 */
export function calculateMajenangPrayerTimes(date: Date = new Date()): PrayerTimeSchedule {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  const JD = getJulianDate(year, month, day);
  const d = JD - 2451545.0;

  const lat = MAJENANG_COORDS.latitude;
  const lon = MAJENANG_COORDS.longitude;
  const tz = MAJENANG_COORDS.timezone;

  const eq = getEquationOfTime(d);
  const dec = getDeclination(d);

  // Solar noon (Transit time) in local hours
  const noon = 12 + tz - (lon / 15) - eq;

  // Hour angles
  const subuhHA = getHourAngle(MAJENANG_COORDS.subuhAngle, dec, lat);
  const sunriseHA = getHourAngle(0.833 + 0.0347 * Math.sqrt(45), dec, lat); // with elevation
  const asharHA = getAsharHourAngle(dec, lat);
  const sunsetHA = getHourAngle(0.833 + 0.0347 * Math.sqrt(45), dec, lat);
  const isyaHA = getHourAngle(MAJENANG_COORDS.isyaAngle, dec, lat);

  const subuhHours = noon - (subuhHA / 15);
  const sunriseHours = noon - (sunriseHA / 15);
  const asharHours = noon + (asharHA / 15);
  const maghribHours = noon + (sunsetHA / 15);
  const isyaHours = noon + (isyaHA / 15);

  const ihtiyat = MAJENANG_COORDS.ihtiyatMinutes; // +2 mins Kemenag standard

  // Imsak is 10 minutes before Subuh
  const subuhTotalMin = Math.round(subuhHours * 60) + ihtiyat;
  const imsakHours = (subuhTotalMin - 10) / 60;

  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  };
  const dateFormatted = date.toLocaleDateString('id-ID', options);

  return {
    imsak: formatHoursToTime(imsakHours),
    subuh: formatHoursToTime(subuhHours, ihtiyat),
    terbit: formatHoursToTime(sunriseHours, -ihtiyat),
    dzuhur: formatHoursToTime(noon, ihtiyat),
    ashar: formatHoursToTime(asharHours, ihtiyat),
    maghrib: formatHoursToTime(maghribHours, ihtiyat),
    isya: formatHoursToTime(isyaHours, ihtiyat),
    dateStr: dateFormatted,
    location: MAJENANG_COORDS.name,
  };
}

/**
 * Returns the next upcoming prayer for the current time
 */
export function getNextPrayer(schedule: PrayerTimeSchedule, now: Date = new Date()): {
  name: string;
  timeStr: string;
  targetDate: Date;
  diffSeconds: number;
} {
  const prayers = [
    { name: 'Subuh', time: schedule.subuh },
    { name: 'Dzuhur', time: schedule.dzuhur },
    { name: 'Ashar', time: schedule.ashar },
    { name: 'Maghrib', time: schedule.maghrib },
    { name: 'Isya', time: schedule.isya },
  ];

  const nowSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();

  for (const p of prayers) {
    const [h, m] = p.time.split(':').map(Number);
    const pSeconds = h * 3600 + m * 60;
    if (pSeconds > nowSeconds) {
      const targetDate = new Date(now);
      targetDate.setHours(h, m, 0, 0);
      return {
        name: p.name,
        timeStr: p.time,
        targetDate,
        diffSeconds: pSeconds - nowSeconds,
      };
    }
  }

  // If all prayers today have passed, next is Subuh tomorrow
  const [subuhH, subuhM] = schedule.subuh.split(':').map(Number);
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(subuhH, subuhM, 0, 0);

  const tomorrowSeconds = 24 * 3600 - nowSeconds + (subuhH * 3600 + subuhM * 60);

  return {
    name: 'Subuh (Besok)',
    timeStr: schedule.subuh,
    targetDate: tomorrow,
    diffSeconds: tomorrowSeconds,
  };
}
