export interface EmergencyCode {
  id: string;
  name: string;
  badge: string;
  title: string;
  category: string;
  colorHex: string;
  colorBorder: string;
  colorBg: string;
  textColor: string;
  iconName: string;
  defaultLocation: string;
  templateScript: (location?: string) => string;
  description: string;
}

export const EMERGENCY_CODES: EmergencyCode[] = [
  {
    id: 'code-red',
    name: 'Code Red',
    badge: '🔴 CODE RED',
    title: 'KEBAKARAN',
    category: 'Kebakaran',
    colorHex: '#ef4444',
    colorBorder: 'border-red-500/60',
    colorBg: 'bg-red-950/40 hover:bg-red-950/60',
    textColor: 'text-red-400',
    iconName: 'Flame',
    defaultLocation: 'Gedung Rawat Inap Lantai 2',
    description: 'Pemberitahuan insiden kebakaran dan mobilisasi tim tanggap darurat APAR / Damkar.',
    templateScript: (loc: string = 'area terkait') =>
      `Code Red, Code Red, Code Red. Telah terjadi kebakaran di area ${loc}. Kepada seluruh petugas terkait, segera menuju lokasi dan lakukan penanganan sesuai prosedur. Kepada pasien, keluarga pasien, dan pengunjung, harap tetap tenang dan mengikuti arahan petugas. Code Red, lokasi ${loc}.`,
  },
  {
    id: 'code-blue',
    name: 'Code Blue',
    badge: '🔵 CODE BLUE',
    title: 'KEDARURATAN MEDIS',
    category: 'Kedaruratan',
    colorHex: '#3b82f6',
    colorBorder: 'border-blue-500/60',
    colorBg: 'bg-blue-950/40 hover:bg-blue-950/60',
    textColor: 'text-blue-400',
    iconName: 'Activity',
    defaultLocation: 'Ruang Melati Kamar 302',
    description: 'Mobilisasi darurat Tim Code Blue RSUD Majenang untuk resusitasi henti jantung/napas.',
    templateScript: (loc: string = 'area terkait') =>
      `Code Blue, Code Blue, Code Blue. Terdapat kejadian kedaruratan di area ${loc}. Kepada Tim Code Blue RSUD Majenang, segera menuju lokasi dan lakukan penanganan sesuai prosedur. Code Blue, lokasi ${loc}.`,
  },
  {
    id: 'code-pink',
    name: 'Code Pink',
    badge: '🩷 CODE PINK',
    title: 'PENCULIKAN BAYI',
    category: 'Penculikan Bayi',
    colorHex: '#ec4899',
    colorBorder: 'border-pink-500/60',
    colorBg: 'bg-pink-950/40 hover:bg-pink-950/60',
    textColor: 'text-pink-400',
    iconName: 'Baby',
    defaultLocation: 'Ruang Perinatologi / Bersalin Lantai 1',
    description: 'Penguncian seluruh pintu keluar dan pengamanan ketat terhadap insiden penculikan/kehilangan bayi.',
    templateScript: (loc: string = 'area terkait') =>
      `Code Pink, Code Pink, Code Pink. Terdapat kejadian penculikan atau kehilangan bayi di area ${loc}. Kepada seluruh petugas terkait, segera lakukan pengamanan sesuai prosedur Code Pink. Kepada pasien dan pengunjung, harap tetap tenang dan mengikuti arahan petugas. Code Pink, lokasi ${loc}.`,
  },
  {
    id: 'code-black',
    name: 'Code Black',
    badge: '⚫ CODE BLACK',
    title: 'LEDAKAN / BOM',
    category: 'Ledakan/Bom',
    colorHex: '#94a3b8',
    colorBorder: 'border-slate-600/80',
    colorBg: 'bg-slate-900/80 hover:bg-slate-800',
    textColor: 'text-slate-300',
    iconName: 'Bomb',
    defaultLocation: 'Area Parkir Depan & Lobby Utama',
    description: 'Ancaman atau ledakan bom, sterilisasi area, dan pengamanan perimeter oleh kepolisian & satpam.',
    templateScript: (loc: string = 'area terkait') =>
      `Code Black, Code Black, Code Black. Terdapat kejadian atau ancaman ledakan bom di area ${loc}. Kepada seluruh petugas terkait, segera lakukan penanganan dan pengamanan sesuai prosedur Code Black. Kepada pasien, keluarga pasien, dan pengunjung, harap tetap tenang, tidak mendekati lokasi, dan mengikuti arahan petugas. Code Black, lokasi ${loc}.`,
  },
  {
    id: 'code-grey',
    name: 'Code Grey',
    badge: '🩶 CODE GREY',
    title: 'BENCANA ALAM',
    category: 'Bencana Alam',
    colorHex: '#a1a1aa',
    colorBorder: 'border-zinc-500/60',
    colorBg: 'bg-zinc-900/60 hover:bg-zinc-900',
    textColor: 'text-zinc-300',
    iconName: 'CloudAlert',
    defaultLocation: 'Seluruh Lingkungan RSUD Majenang',
    description: 'Aktivasi prosedur penanggulangan bencana alam (gempa bumi, banjir, longsor, angin kencang).',
    templateScript: (_loc?: string) =>
      `Code Grey, Code Grey, Code Grey. Telah terjadi bencana alam yang berdampak pada lingkungan RSUD Majenang. Kepada seluruh petugas terkait, segera menjalankan prosedur penanggulangan bencana. Kepada pasien, keluarga pasien, dan pengunjung, harap tetap tenang dan mengikuti arahan petugas. Code Grey, Code Grey, Code Grey.`,
  },
];
