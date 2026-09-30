import React from 'react';

interface SuaraLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSubtitle?: boolean;
}

export const SuaraLogo: React.FC<SuaraLogoProps> = ({
  className = '',
  size = 'md',
  showSubtitle = true,
}) => {
  const sizeMap = {
    sm: { w: 36, h: 36, title: 'text-sm', sub: 'text-[9px]' },
    md: { w: 46, h: 46, title: 'text-base', sub: 'text-[10px]' },
    lg: { w: 60, h: 60, title: 'text-xl', sub: 'text-xs' },
    xl: { w: 84, h: 84, title: 'text-2xl', sub: 'text-sm' },
  };

  const current = sizeMap[size];

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Visual Emblem */}
      <div className="relative shrink-0 flex items-center justify-center">
        <svg
          width={current.w}
          height={current.h}
          viewBox="0 0 120 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="drop-shadow-md"
        >
          {/* Mosque Dome Arch (Green Gradient) */}
          <path
            d="M 60 14 C 54 26 38 32 38 48 C 38 62 44 70 44 72 L 76 72 C 76 70 82 62 82 48 C 82 32 66 26 60 14 Z"
            fill="none"
            stroke="url(#greenGrad)"
            strokeWidth="5"
            strokeLinecap="round"
          />

          {/* Hospital Building with Medical Cross */}
          <rect x="47" y="38" width="26" height="34" rx="2" fill="#0284c7" />
          {/* Medical Cross */}
          <path
            d="M 60 44 L 60 56 M 54 50 L 66 50"
            stroke="white"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          {/* Side hospital building wings */}
          <rect x="41" y="46" width="6" height="26" fill="#38bdf8" opacity="0.8" />
          <rect x="73" y="46" width="6" height="26" fill="#38bdf8" opacity="0.8" />

          {/* Speaker / Megaphone (Deep Blue) */}
          <path
            d="M 64 56 L 78 50 L 78 68 L 64 62 Z"
            fill="#0369a1"
          />
          <rect x="58" y="56" width="6" height="6" rx="1" fill="#0284c7" />

          {/* Audio Waves (Emerald Green) */}
          <path
            d="M 84 53 C 86 56 86 62 84 65"
            stroke="#10b981"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          <path
            d="M 90 48 C 94 54 94 64 90 70"
            stroke="#22c55e"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          <path
            d="M 96 43 C 102 51 102 67 96 75"
            stroke="#4ade80"
            strokeWidth="3.5"
            strokeLinecap="round"
          />

          {/* Flowing River / Foundation Waves (Teal & Cyan) */}
          <path
            d="M 28 76 C 42 68 58 76 76 72 C 86 70 94 74 98 76"
            stroke="#0ea5e9"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <path
            d="M 32 82 C 48 76 64 84 86 78 C 94 76 100 80 102 82"
            stroke="#0284c7"
            strokeWidth="3"
            strokeLinecap="round"
          />

          {/* Gradients */}
          <defs>
            <linearGradient id="greenGrad" x1="38" y1="14" x2="82" y2="72" gradientUnits="userSpaceOnUse">
              <stop stopColor="#10b981" />
              <stop offset="1" stopColor="#059669" />
            </linearGradient>
            <linearGradient id="blueGrad" x1="0" y1="0" x2="1" y2="1">
              <stop stopColor="#0284c7" />
              <stop offset="1" stopColor="#0369a1" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Typography */}
      {showSubtitle && (
        <div className="flex flex-col justify-center">
          <div className="flex items-center gap-1.5 leading-none">
            <span className={`font-black tracking-tight text-white ${current.title}`}>
              SUARA
            </span>
            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-1.5 py-0.5 rounded border border-emerald-500/30">
              RSUD
            </span>
          </div>
          <span className={`font-semibold tracking-wide text-slate-300 ${current.sub} mt-0.5`}>
            Sistem Utama Audio Rumah Sakit
          </span>
          <span className="text-[10px] font-medium tracking-wider text-emerald-400 uppercase">
            RSUD Majenang
          </span>
        </div>
      )}
    </div>
  );
};
