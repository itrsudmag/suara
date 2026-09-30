export interface VoiceProfile {
  id: string;
  name: string;
  role: string;
  gender: 'female' | 'male';
  voiceName: string; // Gemini voice name: Kore, Zephyr, Puck, Fenrir
  recommendedPitch: number;
  recommendedTempo: number;
  description: string;
  isReferenceMatch: boolean;
}

export const VOICE_PROFILES: VoiceProfile[] = [
  {
    id: 'larasati-rsud',
    name: 'Larasati (Penyiar Resmi RSUD Majenang)',
    role: 'Suara Utama Informasi Publik & Jam Besuk (Sesuai Contoh)',
    gender: 'female',
    voiceName: 'Kore',
    recommendedPitch: 1.0,
    recommendedTempo: 0.90, // Calibrated exact tempo of example audio (108 WPM)
    description: 'Vokal wanita alto hangat, santun, artikulatif, berwibawa, dan menenangkan bagi pasien yang sedang beristirahat.',
    isReferenceMatch: true,
  },
  {
    id: 'dian-farmasi',
    name: 'Dian (Operator Poliklinik & Farmasi)',
    role: 'Panggilan Antrean Pasien & Obat',
    gender: 'female',
    voiceName: 'Zephyr',
    recommendedPitch: 1.05,
    recommendedTempo: 0.92,
    description: 'Suara jernih dan tegas dengan artikulasi tajam, sangat jelas terdengar di ruang tunggu poliklinik yang ramai.',
    isReferenceMatch: false,
  },
  {
    id: 'baskara-code',
    name: 'Baskara (Petugas Siaga & Tim Kedaruratan)',
    role: 'Siaran Pria Resmi / Code Alert',
    gender: 'male',
    voiceName: 'Puck',
    recommendedPitch: 0.95,
    recommendedTempo: 0.88,
    description: 'Suara pria berkarakter mantap, tenang, dan tegas untuk pengumuman teknis, ketertiban, dan kedaruratan.',
    isReferenceMatch: false,
  },
];
