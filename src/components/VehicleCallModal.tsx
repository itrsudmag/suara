import React, { useState } from 'react';
import { Car, X, Radio, Volume2, Check, AlertCircle, Sparkles, Send } from 'lucide-react';

interface VehicleCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyScript: (script: string) => void;
}

export const VehicleCallModal: React.FC<VehicleCallModalProps> = ({
  isOpen,
  onClose,
  onApplyScript,
}) => {
  const [vehicleType, setVehicleType] = useState<'mobil' | 'motor' | 'truk'>('mobil');
  const [plateNumber, setPlateNumber] = useState('R 1234 TA');
  const [brand, setBrand] = useState('Toyota Avanza');
  const [color, setColor] = useState('Hitam');
  const [locationIssue, setLocationIssue] = useState('area parkir depan IGD RSUD Majenang, karena kendaraan Anda menghalangi akses keluar-masuk ambulans gawat darurat');

  if (!isOpen) return null;

  const quickIssues = [
    {
      label: 'Halangi Ambulans IGD',
      value: 'area depan IGD RSUD Majenang, karena kendaraan Anda menghalangi akses keluar-masuk ambulans gawat darurat',
    },
    {
      label: 'Halangi Kursi Roda Lobby',
      value: 'selasar depan Lobby Utama RSUD Majenang, karena menghalangi jalur evakuasi dan kursi roda pasien',
    },
    {
      label: 'Halangi Mobil Lain Keluar',
      value: 'area parkir barat RSUD Majenang, karena kendaraan Anda menghalangi kendaraan pasien lain yang hendak keluar',
    },
    {
      label: 'Area Drop-Off Dokter',
      value: 'area drop-off dokter poliklinik, mohon segera dipindahkan ke kantong parkir umum',
    },
    {
      label: 'Jalur Hidran & Pemadam',
      value: 'samping gedung perawatan, karena memblokir titik hidran pemadam kebakaran rumah sakit',
    },
  ];

  const quickPlates = ['R 1234 TA', 'R 5678 XY', 'R 8901 AB', 'R 2345 CD', 'B 1982 RS', 'D 1450 MZ'];

  const vehicleLabel = vehicleType === 'mobil' ? 'kendaraan mobil' : vehicleType === 'motor' ? 'sepeda motor' : 'kendaraan truk logistik';

  const script = `Perhatian-perhatian, panggilan ditujukan kepada pemilik atau pengemudi ${vehicleLabel} merek ${brand} berwarna ${color.toLowerCase()}, dengan nomor polisi ${plateNumber}. Dimohon untuk segera menuju ke ${locationIssue}. Sekali lagi, kepada pemilik kendaraan dengan nomor polisi ${plateNumber}, dimohon untuk segera memindahkan kendaraannya demi kelancaran pelayanan pasien. Terima kasih atas pengertian dan kerja sama Anda.`;

  const handleUse = () => {
    onApplyScript(script);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 relative space-y-4">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
            <Car className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              Panggilan Pemindahan Kendaraan RSUD Majenang
            </h3>
            <p className="text-xs text-slate-400">
              Siarkan panggilan parkir cepat untuk kendaraan yang menghalangi ambulans, akses IGD, atau lobby
            </p>
          </div>
        </div>

        {/* Form Inputs */}
        <div className="space-y-3.5">
          {/* Vehicle Type Toggle */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Jenis Kendaraan:
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setVehicleType('mobil');
                  setBrand('Toyota Avanza');
                }}
                className={`py-2 px-3 rounded-xl border text-xs font-medium transition cursor-pointer ${
                  vehicleType === 'mobil'
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                🚗 Mobil
              </button>
              <button
                type="button"
                onClick={() => {
                  setVehicleType('motor');
                  setBrand('Honda Vario');
                }}
                className={`py-2 px-3 rounded-xl border text-xs font-medium transition cursor-pointer ${
                  vehicleType === 'motor'
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                🛵 Sepeda Motor
              </button>
              <button
                type="button"
                onClick={() => {
                  setVehicleType('truk');
                  setBrand('Truk Box');
                }}
                className={`py-2 px-3 rounded-xl border text-xs font-medium transition cursor-pointer ${
                  vehicleType === 'truk'
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                🚚 Truk / Box
              </button>
            </div>
          </div>

          {/* Plat Nomor & Warna */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Nomor Polisi (Plat Kendaraan):
              </label>
              <input
                type="text"
                value={plateNumber}
                onChange={(e) => setPlateNumber(e.target.value.toUpperCase())}
                placeholder="R 1234 TA"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-amber-300 font-mono font-bold focus:outline-none focus:border-amber-500"
              />
              <div className="flex gap-1.5 mt-1.5 overflow-x-auto py-0.5">
                {quickPlates.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPlateNumber(p)}
                    className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-400 hover:text-white"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Merek & Warna Kendaraan:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  placeholder="Toyota Avanza"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
                <input
                  type="text"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  placeholder="Hitam"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Quick Problem Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Penyebab / Lokasi yang Terhalang:
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {quickIssues.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => setLocationIssue(item.value)}
                  className={`text-[11px] px-2.5 py-1 rounded-lg border transition cursor-pointer ${
                    locationIssue === item.value
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 font-bold'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <textarea
              rows={2}
              value={locationIssue}
              onChange={(e) => setLocationIssue(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Preview */}
          <div className="bg-slate-950 rounded-xl p-3.5 border border-slate-800/90 space-y-1.5">
            <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider block">
              Pratinjau Naskah Siaran Suara AI:
            </span>
            <p className="text-xs text-slate-200 font-mono leading-relaxed bg-slate-900/80 p-3 rounded-lg border border-slate-800">
              "{script}"
            </p>
          </div>

          {/* Apply Button */}
          <button
            type="button"
            onClick={handleUse}
            className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-600/20 transition cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>Terapkan Naskah Panggilan ke Studio Siaran</span>
          </button>
        </div>
      </div>
    </div>
  );
};
