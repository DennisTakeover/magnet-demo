import { useId } from 'react';

/** Glassy iridescent horseshoe magnet with brushed-metal tips (brand visual). Decorative only. */
export default function MagnetArt({ size = 320, rotate = -18, className = '' }: { size?: number; rotate?: number; className?: string }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg className={`magnet-art ${className}`} width={size} height={size} viewBox="0 0 300 300" aria-hidden style={{ transform: `rotate(${rotate}deg)` }}>
      <defs>
        <linearGradient id={`body${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#cfe6ff" />
          <stop offset="35%" stopColor="#a9c8ff" />
          <stop offset="62%" stopColor="#c6b4ff" />
          <stop offset="85%" stopColor="#f2d9ff" />
          <stop offset="100%" stopColor="#bfe4ff" />
        </linearGradient>
        <linearGradient id={`depth${id}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.0" />
          <stop offset="50%" stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#7d6bff" stopOpacity="0.18" />
        </linearGradient>
        <linearGradient id={`metal${id}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#9aa0b4" />
          <stop offset="30%" stopColor="#f4f5fb" />
          <stop offset="55%" stopColor="#c7cbe0" />
          <stop offset="80%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#8e93a8" />
        </linearGradient>
        <filter id={`shadow${id}`} x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="18" stdDeviation="16" floodColor="#5b35f5" floodOpacity="0.18" />
        </filter>
      </defs>
      <g filter={`url(#shadow${id})`}>
        {/* body */}
        <path d="M78 96 V168 A72 72 0 0 0 222 168 V96" fill="none" stroke={`url(#body${id})`} strokeWidth="62" />
        {/* soft inner gloss */}
        <path d="M78 100 V168 A72 72 0 0 0 222 168 V100" fill="none" stroke={`url(#depth${id})`} strokeWidth="62" />
        <path d="M62 104 V170 A88 88 0 0 0 112 248" fill="none" stroke="#ffffff" strokeOpacity="0.75" strokeWidth="6" strokeLinecap="round" />
        <path d="M206 108 V160" fill="none" stroke="#ffffff" strokeOpacity="0.55" strokeWidth="5" strokeLinecap="round" />
        {/* metal tips */}
        <rect x="47" y="44" width="62" height="56" rx="12" fill={`url(#metal${id})`} />
        <rect x="191" y="44" width="62" height="56" rx="12" fill={`url(#metal${id})`} />
        <rect x="47" y="44" width="62" height="14" rx="7" fill="#ffffff" opacity="0.7" />
        <rect x="191" y="44" width="62" height="14" rx="7" fill="#ffffff" opacity="0.7" />
      </g>
    </svg>
  );
}
