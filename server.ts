import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Parse port and host from argv and env
let port = 3000;
const portArgIndex = process.argv.indexOf('--port');
if (portArgIndex !== -1 && process.argv[portArgIndex + 1]) {
  port = parseInt(process.argv[portArgIndex + 1], 10);
} else if (process.env.PORT) {
  port = parseInt(process.env.PORT, 10);
}

let host = '0.0.0.0';
const hostArgIndex = process.argv.indexOf('--host');
if (hostArgIndex !== -1 && process.argv[hostArgIndex + 1]) {
  host = process.argv[hostArgIndex + 1];
}

app.use(express.json({ limit: '10mb' }));

// Health check and capability status
app.get('/api/status', (req, res) => {
  res.json({
    status: 'ok',
    systemName: 'SUARA RSUD Majenang',
    hasApiKey: !!process.env.GEMINI_API_KEY,
    availableModels: ['gemini-3.8-flash-lite-tts', 'gemini-3.8-flash-tts', 'gemini-3.8-flash'],
  });
});

// Helper to format text with rhythmic pacing and clear punctuation for Indonesian hospital voice
function formatTextForAnnouncer(text: string, tempo: number = 0.9): string {
  let formatted = text.trim();
  formatted = formatted.replace(/\s*,\s*/g, ', ');
  formatted = formatted.replace(/\s*\.\s*/g, '. ');
  return formatted;
}

// GET /api/prayer-times: Returns Kemenag calculation for Majenang, Cilacap
app.get('/api/prayer-times', (req, res) => {
  res.json({
    location: 'Majenang, Kab. Cilacap, Jawa Tengah',
    coordinates: { latitude: -7.2975, longitude: 108.7619 },
    timezone: 'Asia/Jakarta (WIB, UTC+7)',
    kemenagStandard: {
      subuhAngle: 20.0,
      isyaAngle: 18.0,
      ihtiyatMinutes: 2,
    },
  });
});

// POST /api/tts: Text to Speech synthesis using Gemini TTS
app.post('/api/tts', async (req, res) => {
  try {
    const {
      text,
      voiceName = 'Kore',
      tempo = 0.9,
      style = 'Warm, compassionate, calm, formal Indonesian hospital announcer and medical information voice. Gentle, soothing, clear enunciation with respectful pauses.',
    } = req.body;

    if (!text || typeof text !== 'string') {
      res.status(400).json({ error: 'Field "text" is required.' });
      return;
    }

    if (!process.env.GEMINI_API_KEY) {
      res.status(503).json({
        error: 'GEMINI_API_KEY is not configured on the server.',
        fallbackAvailable: true,
      });
      return;
    }

    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const preparedText = formatTextForAnnouncer(text, tempo);

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash-lite-tts',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: preparedText,
              speechMetadata: {
                style,
              },
            },
          ],
        },
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    const mimeType = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.mimeType || 'audio/wav';

    if (!base64Audio) {
      res.status(502).json({
        error: 'Model did not return audio data.',
        details: response.text || 'No inline audio received.',
      });
      return;
    }

    res.json({
      success: true,
      audioBase64: base64Audio,
      mimeType,
      sampleRate: 24000,
      charCount: text.length,
      voiceName,
    });
  } catch (error: any) {
    console.error('TTS error:', error);
    res.status(500).json({
      error: error?.message || 'Failed to synthesize speech.',
      details: error?.toString(),
    });
  }
});

// POST /api/generate-announcement: Generates authentic hospital announcements and 5 emergency codes
app.post('/api/generate-announcement', async (req, res) => {
  try {
    const {
      hospitalName = 'RSUD Majenang',
      hospitalCategory = 'visit_hours',
      wardName = 'Ruang Rawat Inap Melati Lantai 2',
      patientName = '',
      queueNumber = '',
      prayerName = 'Dzuhur',
      customNotes = '',
      bilingual = false,
    } = req.body;

    const hospitalTemplates: Record<string, string> = {
      visit_hours: `Perhatian-perhatian, kepada seluruh pengunjung ${hospitalName} yang kami hormati. Waktu berkunjung pasien rawat inap pada hari ini telah berakhir. Demi kenyamanan, ketenangan, serta proses pemulihan pasien yang sedang beristirahat, kami mohon kepada para pengunjung yang tidak berkepentingan untuk dapat segera meninggalkan ruang perawatan. Bagi keluarga yang menjaga pasien, kami ingatkan untuk tetap mematuhi tata tertib rumah sakit, menjaga kartu penunggu, dan menjaga ketenangan lingkungan. Terima kasih atas pengertian dan kerja sama Bapak dan Ibu sekalian.`,
      ktr: `Pengumuman kepada seluruh pasien, keluarga, dan pengunjung ${hospitalName}. Berdasarkan peraturan pemerintah, seluruh area Rumah Sakit merupakan Kawasan Tanpa Rokok. Kami tegaskan bahwa merokok, termasuk rokok elektrik atau vape, dilarang keras di seluruh lingkungan rumah sakit, baik di dalam gedung, koridor, selasar, maupun area parkir. Mari bersama-sama mewujudkan lingkungan rumah sakit yang bersih dan sehat demi kesembuhan pasien. Terima kasih atas perhatian dan kerja sama anda.`,
      quiet_ward: `Kepada seluruh keluarga dan pengunjung pasien di ${wardName} yang kami hormati. Demi mendukung kesembuhan dan kenyamanan pasien yang sedang dirawat, kami himbau untuk senantiasa menjaga ketenangan, tidak membuat kegaduhan, serta mengatur nada dering telepon genggam anda ke mode hening atau getar. Anak-anak di bawah usia 12 tahun tidak diperkenankan berada di ruang rawat inap demi menjaga kesehatan dan daya tahan tubuh anak. Terima kasih atas kepedulian anda.`,
      queue_call: `Nomor antrean ${queueNumber || 'A-045'}${patientName ? `, atas nama ${patientName}` : ''}, dipersilakan menuju ke ${wardName || 'Poliklinik Penyakit Dalam'}. Sekali lagi, nomor antrean ${queueNumber || 'A-045'}, silakan menuju ${wardName || 'Poliklinik Penyakit Dalam'}. Terima kasih.`,
      pharmacy_call: `Panggilan kepada keluarga dari pasien ${patientName || 'Ananda Rafka Pratama'}, dipersilakan menuju ke Loket Tiga Instalasi Farmasi Rawat Jalan untuk pengambilan obat dan penjelasan aturan pakai oleh apoteker. Terima kasih.`,
      family_call: `Panggilan kepada keluarga atau penanggung jawab dari pasien ${patientName || 'Ibu Siti Aminah'}, dimohon untuk segera menemui dokter yang bertugas di ${wardName || 'Instalasi Gawat Darurat (IGD)'}. Terima kasih.`,
      health_education: `Bapak, Ibu, dan seluruh pengunjung ${hospitalName} yang kami hormati. Untuk mencegah penularan penyakit dan infeksi silang, kami mengajak seluruh pengunjung untuk selalu menjaga kebersihan tangan dengan mencuci tangan menggunakan sabun atau cairan antiseptik handrub sebelum dan setelah menyentuh pasien serta saat meninggalkan ruang perawatan. Kebersihan tangan anda adalah keselamatan bagi pasien yang kita sayangi. Terima kasih.`,
      adzan_announcement: `Perhatian-perhatian, kepada seluruh pasien, keluarga, dan pengunjung ${hospitalName} yang kami hormati. Sesaat lagi akan berkumandang adzan ${prayerName} untuk wilayah Majenang, Kabupaten Cilacap dan sekitarnya. Bagi Bapak dan Ibu yang hendak menunaikan ibadah sholat, mushola rumah sakit terletak di lantai satu sayap barat dan area masjid rumah sakit. Mari sejenak menghentikan aktivitas untuk menyambut panggilan sholat. Terima kasih.`,
      
      // 5 Official RSUD Majenang Emergency Codes
      code_red: `Code Red, Code Red, Code Red. Telah terjadi kebakaran di area ${wardName}. Kepada seluruh petugas terkait, segera menuju lokasi dan lakukan penanganan sesuai prosedur. Kepada pasien, keluarga pasien, dan pengunjung, harap tetap tenang dan mengikuti arahan petugas. Code Red, lokasi ${wardName}.`,
      code_blue: `Code Blue, Code Blue, Code Blue. Terdapat kejadian kedaruratan di area ${wardName}. Kepada Tim Code Blue RSUD Majenang, segera menuju lokasi dan lakukan penanganan sesuai prosedur. Code Blue, lokasi ${wardName}.`,
      code_pink: `Code Pink, Code Pink, Code Pink. Terdapat kejadian penculikan atau kehilangan bayi di area ${wardName}. Kepada seluruh petugas terkait, segera lakukan pengamanan sesuai prosedur Code Pink. Kepada pasien dan pengunjung, harap tetap tenang dan mengikuti arahan petugas. Code Pink, lokasi ${wardName}.`,
      code_black: `Code Black, Code Black, Code Black. Terdapat kejadian atau ancaman ledakan bom di area ${wardName}. Kepada seluruh petugas terkait, segera lakukan penanganan dan pengamanan sesuai prosedur Code Black. Kepada pasien, keluarga pasien, dan pengunjung, harap tetap tenang, tidak mendekati lokasi, dan mengikuti arahan petugas. Code Black, lokasi ${wardName}.`,
      code_grey: `Code Grey, Code Grey, Code Grey. Telah terjadi bencana alam yang berdampak pada lingkungan RSUD Majenang. Kepada seluruh petugas terkait, segera menjalankan prosedur penanggulangan bencana. Kepada pasien, keluarga pasien, dan pengunjung, harap tetap tenang dan mengikuti arahan petugas. Code Grey, Code Grey, Code Grey.`,
    };

    if (!process.env.GEMINI_API_KEY) {
      res.json({
        indonesianText: hospitalTemplates[hospitalCategory] || hospitalTemplates.visit_hours,
        englishText: bilingual ? `Attention to all visitors and patients of ${hospitalName}. Please follow staff instructions. Thank you.` : '',
        source: 'template_fallback',
      });
      return;
    }

    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const prompt = `Anda adalah voice scriptwriter profesional untuk Public Address (PA) / Pengumuman Informasi Publik Rumah Sakit RSUD Majenang, Kabupaten Cilacap.
Buatkan naskah pengumuman resmi rumah sakit dengan bahasa Indonesia yang santun, menenangkan, empati, ramah, dan tertib.
Data Rumah Sakit:
- Nama Rumah Sakit: ${hospitalName}
- Kategori Pengumuman: ${hospitalCategory}
- Lokasi / Gedung / Ruang: ${wardName}
${patientName ? `- Nama Pasien: ${patientName}` : ''}
${queueNumber ? `- Nomor Antrean: ${queueNumber}` : ''}
${customNotes ? `- Catatan Khusus: ${customNotes}` : ''}
${bilingual ? '- Buat versi Bahasa Indonesia dan versi Bahasa Inggris' : '- Hanya versi Bahasa Indonesia'}

ATURAN GAYA BAHASA & TANDA BACA RUMAH SAKIT:
1. Nada suara menenangkan, ramah, tidak membuat panik pasien (kecuali kode kedaruratan yang harus tegas dan berulang 3x).
2. Gunakan tanda koma (,) dan titik (.) dengan jarak ritmis yang teratur agar model Text-to-Speech memberikan jeda napas 450ms yang nyaman.
3. Output dalam JSON murni:
{
  "indonesianText": "teks naskah pengumuman bahasa indonesia",
  "englishText": "teks bahasa inggris (jika diminta, atau kosong jika tidak)"
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    try {
      const data = JSON.parse(response.text?.trim() || '{}');
      res.json(data);
    } catch {
      res.json({
        indonesianText: hospitalTemplates[hospitalCategory] || response.text || '',
        englishText: '',
      });
    }
  } catch (error: any) {
    console.warn('Generate announcement API error, using authentic template fallback:', error?.message);
    const category = req.body.hospitalCategory || 'visit_hours';
    const loc = req.body.wardName || 'Ruang Rawat Inap';
    const hospital = req.body.hospitalName || 'RSUD Majenang';

    const fallbackScripts: Record<string, string> = {
      code_red: `Code Red, Code Red, Code Red. Telah terjadi kebakaran di area ${loc}. Kepada seluruh petugas terkait, segera menuju lokasi dan lakukan penanganan sesuai prosedur. Kepada pasien, keluarga pasien, dan pengunjung, harap tetap tenang dan mengikuti arahan petugas. Code Red, lokasi ${loc}.`,
      code_blue: `Code Blue, Code Blue, Code Blue. Terdapat kejadian kedaruratan di area ${loc}. Kepada Tim Code Blue RSUD Majenang, segera menuju lokasi dan lakukan penanganan sesuai prosedur. Code Blue, lokasi ${loc}.`,
      code_pink: `Code Pink, Code Pink, Code Pink. Terdapat kejadian penculikan atau kehilangan bayi di area ${loc}. Kepada seluruh petugas terkait, segera lakukan pengamanan sesuai prosedur Code Pink. Kepada pasien dan pengunjung, harap tetap tenang dan mengikuti arahan petugas. Code Pink, lokasi ${loc}.`,
      code_black: `Code Black, Code Black, Code Black. Terdapat kejadian atau ancaman ledakan bom di area ${loc}. Kepada seluruh petugas terkait, segera lakukan penanganan dan pengamanan sesuai prosedur Code Black. Kepada pasien, keluarga pasien, dan pengunjung, harap tetap tenang, tidak mendekati lokasi, dan mengikuti arahan petugas. Code Black, lokasi ${loc}.`,
      code_grey: `Code Grey, Code Grey, Code Grey. Telah terjadi bencana alam yang berdampak pada lingkungan RSUD Majenang. Kepada seluruh petugas terkait, segera menjalankan prosedur penanggulangan bencana. Kepada pasien, keluarga pasien, dan pengunjung, harap tetap tenang dan mengikuti arahan petugas. Code Grey, Code Grey, Code Grey.`,
      visit_hours: `Perhatian-perhatian, kepada seluruh pengunjung ${hospital} yang kami hormati. Waktu berkunjung pasien rawat inap pada hari ini telah berakhir. Demi kenyamanan, ketenangan, serta proses pemulihan pasien yang sedang beristirahat, kami mohon kepada para pengunjung yang tidak berkepentingan untuk dapat segera meninggalkan ruang perawatan. Terima kasih.`,
      adzan_announcement: `Perhatian-perhatian, kepada seluruh pasien, keluarga, dan pengunjung ${hospital} yang kami hormati. Sesaat lagi akan berkumandang adzan ${req.body.prayerName || 'Dzuhur'} untuk wilayah Majenang, Kabupaten Cilacap dan sekitarnya. Terima kasih.`,
    };

    res.json({
      indonesianText: fallbackScripts[category] || fallbackScripts.visit_hours,
      englishText: '',
      source: 'template_fallback',
    });
  }
});

// Setup Vite dev server or static serving
async function startServer() {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, host, () => {
    console.log(`Server listening on http://${host}:${port}`);
    console.log(`  > Local:   http://localhost:${port}/`);
    console.log(`  > Network: http://${host}:${port}/`);
  });
}

startServer();
