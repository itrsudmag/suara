export interface HospitalPreset {
  id: string;
  category: string;
  categoryLabel: string;
  title: string;
  location: string;
  textIndonesian: string;
  textEnglish?: string;
  wpm: number;
  durationEstimate: string;
  chimeType: 'hospital' | 'emergency' | 'none';
  tags: string[];
}

export const VISITING_OPEN_SCRIPT = `Perhatian kepada seluruh pengunjung RSUD Majenang. Kami informasikan bahwa waktu berkunjung atau jam besuk pasien telah dibuka. Demi kenyamanan, kesembuhan, dan keselamatan pasien, kami mengimbau kepada seluruh pengunjung untuk selalu menjaga ketertiban dan ketenangan di area ruang perawatan, membatasi jumlah pengunjung di dalam kamar secara bergantian, serta tidak membawa anak-anak di bawah usia 12 tahun ke area perawatan. Atas perhatian dan kerja sama Bapak, Ibu, serta Saudara sekalian, kami ucapkan terima kasih.`;

export const VISITING_CLOSE_SCRIPT = `Perhatian kepada seluruh pengunjung RSUD Majenang. Kami informasikan bahwa waktu berkunjung atau jam besuk pasien untuk sesi ini telah habis. Demi kenyamanan, ketenangan, serta waktu istirahat yang optimal bagi seluruh pasien, kami mengimbau kepada para pengunjung yang tidak berkepentingan untuk menjaga pasien agar segera meninggalkan area ruang perawatan dengan tertib. Bagi keluarga yang bertugas menjaga pasien, mohon untuk selalu menggunakan kartu pengunjung yang sah. Atas perhatian, pengertian, dan kerja sama Anda, kami ucapkan terima kasih.`;

export const VISITING_CLOSE_FULL_SCRIPT = `Perhatian-perhatian, kepada seluruh pengunjung Rumah Sakit yang kami hormati. Waktu berkunjung pasien rawat inap pada hari ini telah berakhir. Demi kenyamanan, ketenangan, serta proses pemulihan pasien yang sedang beristirahat, kami mohon kepada para pengunjung yang tidak berkepentingan untuk dapat segera meninggalkan ruang perawatan. Bagi keluarga yang menjaga pasien, kami ingatkan untuk tetap mematuhi tata tertib rumah sakit, menjaga kartu penunggu, dan menjaga ketenangan lingkungan. Terima kasih atas pengertian dan kerja sama Bapak dan Ibu sekalian.`;

export const VEHICLE_MOVE_CAR_SCRIPT = `Perhatian-perhatian, panggilan ditujukan kepada pemilik kendaraan mobil Toyota Avanza berwarna hitam, dengan nomor polisi R 1234 TA. Dimohon untuk segera menuju ke area parkir depan IGD RSUD Majenang, karena kendaraan Anda menghalangi akses keluar masuk ambulans gawat darurat. Sekali lagi, kepada pemilik kendaraan mobil dengan nomor polisi R 1234 TA, dimohon untuk segera memindahkan kendaraannya. Terima kasih atas kerja sama Anda.`;

export const VEHICLE_MOVE_MOTOR_SCRIPT = `Perhatian-perhatian, panggilan ditujukan kepada pemilik sepeda motor Honda Vario berwarna putih, dengan nomor polisi R 5678 XY. Dimohon untuk segera menuju ke area selasar depan lobby utama RSUD Majenang, karena kendaraan Anda menghalangi jalur kursi roda pasien dan akses pejalan kaki. Dimohon untuk segera memindahkan sepeda motor Anda ke area parkir yang telah disediakan. Terima kasih atas kepedulian Anda.`;

export const HOSPITAL_DEFAULT_SCRIPT = VISITING_CLOSE_FULL_SCRIPT;

export const HOSPITAL_PRESETS: HospitalPreset[] = [
  {
    id: 'rs-visit-full',
    category: 'visit_hours',
    categoryLabel: 'Jam Besuk Berakhir',
    title: 'Pengumuman Waktu Berkunjung / Jam Besuk Hari Ini Telah Berakhir',
    location: 'Seluruh Ruang Rawat Inap RSUD Majenang',
    textIndonesian: VISITING_CLOSE_FULL_SCRIPT,
    wpm: 106,
    durationEstimate: '45 detik',
    chimeType: 'hospital',
    tags: ['Jam Besuk', 'Waktu Istirahat', 'Kartu Penunggu'],
  },
  {
    id: 'rs-pindah-mobil',
    category: 'vehicle_move',
    categoryLabel: 'Pindah Mobil (Halangi Ambulans)',
    title: 'Panggilan Pemindahan Mobil Menghalangi Akses IGD / Ambulans',
    location: 'Area Parkir & Jalur Akses IGD',
    textIndonesian: VEHICLE_MOVE_CAR_SCRIPT,
    wpm: 108,
    durationEstimate: '34 detik',
    chimeType: 'hospital',
    tags: ['Parkir', 'Pindah Mobil', 'Jalur Ambulans', 'IGD'],
  },
  {
    id: 'rs-pindah-motor',
    category: 'vehicle_move',
    categoryLabel: 'Pindah Sepeda Motor',
    title: 'Panggilan Pemindahan Motor Menghalangi Kursi Roda & Lobby',
    location: 'Lobby & Selasar Depan RSUD',
    textIndonesian: VEHICLE_MOVE_MOTOR_SCRIPT,
    wpm: 108,
    durationEstimate: '32 detik',
    chimeType: 'hospital',
    tags: ['Parkir', 'Pindah Motor', 'Kursi Roda', 'Lobby'],
  },
  {
    id: 'rs-visit-open',
    category: 'visit_open',
    categoryLabel: 'Jam Besuk Buka',
    title: 'Pengumuman Jam Besuk Pasien Telah Dibuka',
    location: 'Seluruh Ruang Rawat Inap RSUD Majenang',
    textIndonesian: VISITING_OPEN_SCRIPT,
    wpm: 106,
    durationEstimate: '42 detik',
    chimeType: 'hospital',
    tags: ['Jam Besuk', 'Buka', 'Rawat Inap'],
  },
  {
    id: 'rs-visit-end',
    category: 'visit_hours',
    categoryLabel: 'Jam Besuk Tutup Sesi',
    title: 'Pengumuman Jam Besuk Pasien Sesi Ini Telah Habis',
    location: 'Seluruh Ruang Rawat Inap RSUD Majenang',
    textIndonesian: VISITING_CLOSE_SCRIPT,
    wpm: 106,
    durationEstimate: '45 detik',
    chimeType: 'hospital',
    tags: ['Jam Besuk', 'Tutup', 'Ketenangan'],
  },
  {
    id: 'rs-adzan-majenang',
    category: 'adzan_sholat',
    categoryLabel: 'Panggilan Sholat & Adzan',
    title: 'Pengumuman Waktu Sholat & Adzan Wilayah Majenang',
    location: 'Seluruh Gedung & Area RSUD Majenang',
    textIndonesian: `Perhatian-perhatian, kepada seluruh pasien, keluarga, dan pengunjung RSUD Majenang yang kami hormati. Sesaat lagi akan berkumandang adzan Dzuhur untuk wilayah Majenang, Kabupaten Cilacap dan sekitarnya. Bagi Bapak dan Ibu yang hendak menunaikan ibadah sholat, mushola rumah sakit terletak di lantai satu sayap barat dan masjid utama di area gedung rumah sakit. Mari sejenak menghentikan aktivitas untuk menyambut panggilan sholat. Terima kasih.`,
    textEnglish: `Attention to all patients and visitors of RSUD Majenang. The prayer call will commence shortly for Majenang, Cilacap area. The prayer room is located on the first floor west wing. Thank you.`,
    wpm: 106,
    durationEstimate: '32 detik',
    chimeType: 'hospital',
    tags: ['Adzan', 'Majenang', 'Cilacap', 'Jadwal Kemenag'],
  },
  {
    id: 'rs-ktr',
    category: 'safety_ktr',
    categoryLabel: 'Kawasan Tanpa Rokok (KTR)',
    title: 'Larangan Merokok & Kawasan Tanpa Rokok 100%',
    location: 'Seluruh Area & Lingkungan Rumah Sakit',
    textIndonesian: `Pengumuman kepada seluruh pasien, keluarga, dan pengunjung Rumah Sakit. Berdasarkan peraturan pemerintah, seluruh area Rumah Sakit merupakan Kawasan Tanpa Rokok. Kami tegaskan bahwa merokok, termasuk rokok elektrik atau vape, dilarang keras di seluruh lingkungan rumah sakit, baik di dalam gedung, koridor, selasar, maupun area parkir. Mari bersama-sama mewujudkan lingkungan rumah sakit yang bersih dan sehat demi kesembuhan pasien. Terima kasih atas perhatian dan kerja sama anda.`,
    textEnglish: `Attention to all patients and visitors. Smoking or vaping is strictly prohibited in all hospital areas, including corridors, courtyards, and parking lots. Please help us maintain a smoke-free environment. Thank you.`,
    wpm: 108,
    durationEstimate: '38 detik',
    chimeType: 'hospital',
    tags: ['KTR', 'Larangan Merokok', 'Kesehatan'],
  },
  {
    id: 'rs-quiet-ward',
    category: 'quiet_ward',
    categoryLabel: 'Harap Tenang di Ruang Rawat',
    title: 'Himbauan Menjaga Ketenangan & Mengatur Nada Dering Telepon',
    location: 'Lantai Rawat Inap & ICU',
    textIndonesian: `Kepada seluruh keluarga dan pengunjung pasien yang kami hormati. Demi mendukung kesembuhan dan kenyamanan pasien yang sedang dirawat, kami himbau untuk senantiasa menjaga ketenangan, tidak membuat kegaduhan, serta mengatur nada dering telepon genggam anda ke mode hening atau getar. Anak-anak di bawah usia 12 tahun tidak diperkenankan berada di ruang rawat inap demi menjaga kesehatan dan daya tahan tubuh anak. Terima kasih atas kepedulian anda.`,
    textEnglish: `Dear visitors and families, please maintain silence in the inpatient wards and set your mobile phones to silent mode. For infection prevention, children under 12 are not permitted in patient rooms. Thank you for your care.`,
    wpm: 105,
    durationEstimate: '35 detik',
    chimeType: 'hospital',
    tags: ['Harap Tenang', 'ICU', 'Ketertiban'],
  },
  {
    id: 'rs-queue-poliklinik',
    category: 'queue_call',
    categoryLabel: 'Panggilan Antrean Poliklinik',
    title: 'Panggilan Antrean Pasien Menuju Poliklinik Spesialis',
    location: 'Lobby & Ruang Tunggu Poliklinik',
    textIndonesian: `Nomor antrean A, nol empat puluh lima, atas nama Bapak Suryanto, dipersilakan menuju ke Poliklinik Penyakit Dalam di Ruang Konsultasi Tiga Lantai Dua. Sekali lagi, nomor antrean A, nol empat puluh lima, silakan menuju Poliklinik Penyakit Dalam. Terima kasih.`,
    wpm: 104,
    durationEstimate: '20 detik',
    chimeType: 'hospital',
    tags: ['Antrean', 'Poliklinik', 'Panggilan Pasien'],
  },
  {
    id: 'rs-farmasi-call',
    category: 'pharmacy_call',
    categoryLabel: 'Pengambilan Obat Farmasi',
    title: 'Panggilan Keluarga Pasien ke Loket Farmasi',
    location: 'Instalasi Farmasi Rawat Jalan',
    textIndonesian: `Panggilan kepada keluarga dari pasien Ananda Rafka Pratama, dipersilakan menuju ke Loket Tiga Instalasi Farmasi Rawat Jalan untuk pengambilan obat dan penjelasan aturan pakai oleh apoteker. Terima kasih.`,
    wpm: 106,
    durationEstimate: '18 detik',
    chimeType: 'hospital',
    tags: ['Farmasi', 'Obat', 'Apotek'],
  },
  {
    id: 'rs-family-igd',
    category: 'family_call',
    categoryLabel: 'Panggilan Keluarga Pasien IGD',
    title: 'Panggilan Keluarga Pasien Menemui Dokter di IGD',
    location: 'Instalasi Gawat Darurat (IGD)',
    textIndonesian: `Panggilan kepada keluarga atau penanggung jawab dari pasien Ibu Siti Aminah, dimohon untuk segera menemui dokter yang bertugas di Ruang Konsultasi Instalasi Gawat Darurat. Terima kasih.`,
    textEnglish: `Calling the family or guardian of patient Mrs. Siti Aminah, please proceed immediately to the consultation room at the Emergency Department. Thank you.`,
    wpm: 108,
    durationEstimate: '15 detik',
    chimeType: 'hospital',
    tags: ['IGD', 'Darurat', 'Keluarga Pasien'],
  },
  {
    id: 'rs-code-blue',
    category: 'emergency_code',
    categoryLabel: 'Code Blue (Henti Jantung)',
    title: 'Code Blue Kegawatdaruratan Medis Tim Reaksi Cepat',
    location: 'Area Rawat Inap & Seluruh Gedung',
    textIndonesian: `Code Blue, Code Blue, Code Blue. Terjadi kegawatdaruratan medis henti jantung di Ruang Rawat Inap Melati, Lantai Tiga, Kamar Tiga Nol Dua. Kepada Tim Medis Reaksi Cepat Code Blue, dimohon segera menuju ke lokasi. Terima kasih.`,
    textEnglish: `Code Blue, Code Blue, Code Blue. Medical emergency in Melati Ward, 3rd Floor, Room 302. Code Blue rapid response team, please respond immediately.`,
    wpm: 112,
    durationEstimate: '22 detik',
    chimeType: 'emergency',
    tags: ['Code Blue', 'Emergency Medis', 'Resusitasi'],
  },
  {
    id: 'rs-ppi-handwash',
    category: 'health_education',
    categoryLabel: 'Edukasi Kebersihan & Cuci Tangan',
    title: 'Himbauan Cuci Tangan 6 Langkah Pencegahan Infeksi (PPI)',
    location: 'Seluruh Koridor & Pintu Masuk',
    textIndonesian: `Bapak, Ibu, dan seluruh pengunjung yang kami hormati. Untuk mencegah penularan penyakit dan infeksi silang, kami mengajak seluruh pengunjung untuk selalu menjaga kebersihan tangan dengan mencuci tangan menggunakan sabun atau cairan antiseptik handrub sebelum dan setelah menyentuh pasien serta saat meninggalkan ruang perawatan. Kebersihan tangan anda adalah keselamatan bagi pasien yang kita sayangi. Terima kasih.`,
    wpm: 108,
    durationEstimate: '32 detik',
    chimeType: 'hospital',
    tags: ['PPI', 'Cuci Tangan', 'Pencegahan Infeksi'],
  },
];
