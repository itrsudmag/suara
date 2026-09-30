import React, { useState } from 'react';
import { Sparkles, X, Building2, Clock, MapPin, Check, Loader2, AlertTriangle, User, Hash } from 'lucide-react';
import { SuaraLogo } from './SuaraLogo';

interface AiScriptGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyScript: (script: string, englishScript?: string) => void;
}

export const AiScriptGeneratorModal: React.FC<AiScriptGeneratorModalProps> = ({
  isOpen,
  onClose,
  onApplyScript,
}) => {
  const [hospitalName, setHospitalName] = useState('RSUD Majenang');
  const [hospitalCategory, setHospitalCategory] = useState('visit_hours');
  const [wardName, setWardName] = useState('Ruang Rawat Inap Melati Lantai 2');
  const [patientName, setPatientName] = useState('');
  const [queueNumber, setQueueNumber] = useState('');
  const [prayerName, setPrayerName] = useState('Dzuhur');
  const [bilingual, setBilingual] = useState(false);
  const [customNotes, setCustomNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [generatedResult, setGeneratedResult] = useState<{ indonesianText: string; englishText?: string } | null>(null);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    setIsLoading(true);
    setGeneratedResult(null);

    try {
      const res = await fetch('/api/generate-announcement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hospitalName,
          hospitalCategory,
          wardName,
          patientName,
          queueNumber,
          prayerName,
          customNotes,
          bilingual,
        }),
      });

      if (!res.ok) {
        throw new Error('Gagal menghasilkan naskah pengumuman.');
      }

      const data = await res.json();
      setGeneratedResult({
        indonesianText: data.indonesianText,
        englishText: data.englishText,
      });
    } catch (err: any) {
      console.error('Error generating script:', err);
      // Fallback
      setGeneratedResult({
        indonesianText: `Perhatian-perhatian, kepada seluruh pengunjung ${hospitalName} yang kami hormati. Waktu berkunjung pasien rawat inap pada hari ini telah berakhir. Demi ketenangan dan proses pemulihan pasien, kami mohon kepada pengunjung untuk segera meninggalkan ruang perawatan. Terima kasih atas pengertian dan kerja sama anda.`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUseScript = () => {
    if (generatedResult?.indonesianText) {
      onApplyScript(generatedResult.indonesianText, generatedResult.englishText);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header with Logo */}
        <div className="flex items-center gap-3 mb-5 pb-4 border-b border-slate-800">
          <SuaraLogo size="md" showSubtitle={false} />
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              Generator Naskah Resmi SUARA RSUD Majenang
            </h3>
            <p className="text-xs text-slate-400">
              Buat naskah pengumuman resmi rumah sakit dengan diksi santun dan intonasi teratur (AI Gemini)
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-emerald-400" /> Nama Rumah Sakit
              </label>
              <input
                type="text"
                value={hospitalName}
                onChange={(e) => setHospitalName(e.target.value)}
                placeholder="RSUD Majenang"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Kategori Pengumuman
              </label>
              <select
                value={hospitalCategory}
                onChange={(e) => setHospitalCategory(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="visit_hours">Jam Kunjung / Waktu Besuk Berakhir</option>
                <option value="ktr">Kawasan Tanpa Rokok (KTR 100%)</option>
                <option value="quiet_ward">Harap Tenang di Ruang Rawat Inap & ICU</option>
                <option value="queue_call">Panggilan Antrean Poliklinik</option>
                <option value="pharmacy_call">Panggilan Pengambilan Obat di Farmasi</option>
                <option value="family_call">Panggilan Keluarga Pasien ke IGD / Dokter</option>
                <option value="adzan_announcement">Panggilan Waktu Sholat & Adzan Majenang</option>
                <option value="code_red">🔴 Code Red (Kebakaran)</option>
                <option value="code_blue">🔵 Code Blue (Kedaruratan Medis)</option>
                <option value="code_pink">🩷 Code Pink (Penculikan Bayi)</option>
                <option value="code_black">⚫ Code Black (Ledakan / Bom)</option>
                <option value="code_grey">🩶 Code Grey (Bencana Alam)</option>
                <option value="health_education">Edukasi Cuci Tangan 6 Langkah (PPI)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-cyan-400" /> Lokasi / Ruangan / Gedung
              </label>
              <input
                type="text"
                value={wardName}
                onChange={(e) => setWardName(e.target.value)}
                placeholder="Contoh: Gedung Melati Lantai 2, Ruang IGD"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            {(hospitalCategory === 'queue_call' || hospitalCategory === 'pharmacy_call' || hospitalCategory === 'family_call') ? (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-amber-400" /> Nama Pasien (Opsional)
                </label>
                <input
                  type="text"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  placeholder="Contoh: Bapak Suryanto, Ananda Rafka"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            ) : hospitalCategory === 'adzan_announcement' ? (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-emerald-400" /> Waktu Sholat
                </label>
                <select
                  value={prayerName}
                  onChange={(e) => setPrayerName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="Subuh">Subuh</option>
                  <option value="Dzuhur">Dzuhur</option>
                  <option value="Ashar">Ashar</option>
                  <option value="Maghrib">Maghrib</option>
                  <option value="Isya">Isya</option>
                </select>
              </div>
            ) : (
              <div className="flex items-center pt-6">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={bilingual}
                    onChange={(e) => setBilingual(e.target.checked)}
                    className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-400 w-4 h-4 bg-slate-950"
                  />
                  Sertakan Versi Bahasa Inggris (Bilingual)
                </label>
              </div>
            )}
          </div>

          {hospitalCategory === 'queue_call' && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-purple-400" /> Nomor Antrean
              </label>
              <input
                type="text"
                value={queueNumber}
                onChange={(e) => setQueueNumber(e.target.value)}
                placeholder="Contoh: A-045, B-112"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Catatan Khusus (Opsional)
            </label>
            <input
              type="text"
              value={customNotes}
              onChange={(e) => setCustomNotes(e.target.value)}
              placeholder="Contoh: Pintu keluar peron timur dibuka, wajib masker di ruang rawat..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <button
            onClick={handleGenerate}
            disabled={isLoading}
            className="w-full mt-2 py-2.5 rounded-xl text-white font-medium text-sm flex items-center justify-center gap-2 shadow-lg transition disabled:opacity-60 cursor-pointer bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-emerald-600/25"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Meracik Naskah Resmi RSUD Majenang...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Hasilkan Naskah Pengumuman Otomatis
              </>
            )}
          </button>

          {generatedResult && (
            <div className="mt-4 p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                  Hasil Naskah Pengumuman:
                </span>
                <span className="text-[11px] text-slate-400">
                  {generatedResult.indonesianText.length} Karakter
                </span>
              </div>
              <p className="text-sm text-slate-200 leading-relaxed font-normal bg-slate-900/60 p-3 rounded-lg border border-slate-800/80">
                {generatedResult.indonesianText}
              </p>

              {generatedResult.englishText && (
                <div>
                  <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider block mb-1">
                    Versi Bahasa Inggris:
                  </span>
                  <p className="text-xs text-slate-300 italic bg-slate-900/60 p-3 rounded-lg border border-slate-800/80">
                    {generatedResult.englishText}
                  </p>
                </div>
              )}

              <button
                onClick={handleUseScript}
                className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Check className="w-4 h-4" />
                Gunakan Naskah Ini di Studio
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
