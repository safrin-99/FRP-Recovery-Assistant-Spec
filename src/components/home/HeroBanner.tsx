import { Layers, LifeBuoy, ShieldCheck, type LucideIcon } from 'lucide-react'

const BENEFITS: ReadonlyArray<{ icon: LucideIcon; label: string; color: string }> = [
  { icon: ShieldCheck, label: 'Safe Diagnostics', color: 'text-success' },
  { icon: LifeBuoy, label: 'Guided Recovery', color: 'text-cyan' },
  { icon: Layers, label: 'Multi Brand', color: 'text-blue-hover' },
]

/**
 * Ilustrasi vektor dua ponsel generik + panah cyan (DESIGN.md §7). Sengaja tidak
 * meniru UI atau logo layanan pihak ketiga; layar hanya berisi bentuk abstrak.
 */
function PhonesArtwork() {
  return (
    <svg
      viewBox="0 0 560 300"
      aria-hidden
      className="pointer-events-none h-full w-auto max-w-full"
      preserveAspectRatio="xMaxYMax meet"
    >
      <defs>
        <linearGradient id="hero-frame" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2b4767" />
          <stop offset="1" stopColor="#0f1d2e" />
        </linearGradient>
        <linearGradient id="hero-screen-a" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e9f1fc" />
          <stop offset="1" stopColor="#c9d8ec" />
        </linearGradient>
        <linearGradient id="hero-screen-b" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#10c8f5" />
          <stop offset="0.55" stopColor="#1689ff" />
          <stop offset="1" stopColor="#1558f5" />
        </linearGradient>
        <linearGradient id="hero-arrow" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#10c8f5" stopOpacity="0.15" />
          <stop offset="1" stopColor="#10c8f5" />
        </linearGradient>
      </defs>

      {/* Ponsel kiri: layar terang dengan panel verifikasi abstrak */}
      <g transform="translate(78 26) rotate(5)">
        <rect width="210" height="330" rx="30" fill="url(#hero-frame)" stroke="#4a6a8f" strokeWidth="2" />
        <rect x="11" y="11" width="188" height="308" rx="22" fill="url(#hero-screen-a)" />
        <circle cx="105" cy="28" r="5" fill="#0f1d2e" />
        <rect x="58" y="72" width="94" height="94" rx="47" fill="#1264f5" opacity="0.12" />
        <path
          d="M105 92 l26 10 v20 c0 18 -12 30 -26 36 c-14 -6 -26 -18 -26 -36 v-20 z"
          fill="none"
          stroke="#1264f5"
          strokeWidth="5"
          strokeLinejoin="round"
        />
        <path d="M94 124 l8 8 l16 -18" fill="none" stroke="#1264f5" strokeWidth="5" strokeLinecap="round" />
        <rect x="40" y="190" width="130" height="10" rx="5" fill="#34475d" opacity="0.55" />
        <rect x="56" y="210" width="98" height="8" rx="4" fill="#34475d" opacity="0.35" />
        <rect x="32" y="240" width="146" height="34" rx="9" fill="#ffffff" stroke="#9fb3cc" />
        <rect x="118" y="286" width="60" height="22" rx="6" fill="#1264f5" />
      </g>

      {/* Panah cyan di antara kedua ponsel */}
      <path d="M262 150 h72 v-24 l46 40 l-46 40 v-24 h-72 z" fill="url(#hero-arrow)" />

      {/* Ponsel kanan: layar beranda abstrak */}
      <g transform="translate(372 4) rotate(-2)">
        <rect width="196" height="330" rx="30" fill="url(#hero-frame)" stroke="#4a6a8f" strokeWidth="2" />
        <rect x="11" y="11" width="174" height="308" rx="22" fill="url(#hero-screen-b)" />
        <circle cx="98" cy="28" r="5" fill="#0f1d2e" />
        <circle cx="140" cy="128" r="70" fill="#ffbd59" opacity="0.85" />
        <rect x="26" y="168" width="144" height="26" rx="13" fill="#ffffff" opacity="0.92" />
        {[0, 1, 2, 3].map((i) => (
          <rect key={i} x={30 + i * 37} y="214" width="26" height="26" rx="8" fill="#ffffff" opacity={0.75 - i * 0.1} />
        ))}
        {[0, 1, 2, 3].map((i) => (
          <rect key={i} x={30 + i * 37} y="256" width="26" height="26" rx="8" fill="#ffffff" opacity={0.55 - i * 0.08} />
        ))}
      </g>
    </svg>
  )
}

export function HeroBanner() {
  return (
    <section
      aria-labelledby="hero-title"
      className="relative min-h-[clamp(232px,30vh,308px)] shrink-0 overflow-hidden rounded-ui-lg border border-line bg-[#0a1424]"
    >
      {/* Glow biru terkendali di tengah/kanan */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(60% 90% at 62% 40%, rgb(22 137 255 / 0.32), transparent 70%), radial-gradient(40% 70% at 90% 10%, rgb(16 200 245 / 0.18), transparent 70%)',
        }}
      />
      <div className="relative z-10 flex min-h-[inherit] max-w-[60%] flex-col justify-center gap-[clamp(10px,1.6vh,18px)] py-6 pr-6 pl-10 max-[1399px]:pl-7">
        <h1 id="hero-title" className="text-[clamp(34px,3vw,44px)] leading-[1.1] font-bold tracking-tight text-fg">
          FRP Recovery
        </h1>
        <p className="text-[clamp(18px,1.55vw,23px)] leading-snug font-normal text-fg-2">
          Diagnosis &amp; Panduan Pemulihan Android
          <br />
          Aman, Terarah, dan Lewat Jalur Resmi.
        </p>
        <ul className="mt-2 flex flex-wrap items-center gap-x-8 gap-y-2">
          {BENEFITS.map(({ icon: Icon, label, color }) => (
            <li key={label} className="flex items-center gap-2.5 text-base font-medium text-fg">
              <Icon aria-hidden className={`size-8 ${color}`} strokeWidth={1.75} />
              {label}
            </li>
          ))}
        </ul>
      </div>
      <div className="absolute top-0 right-0 bottom-0 flex w-[46%] items-end justify-end max-[1279px]:w-[40%] max-[1279px]:opacity-80">
        <PhonesArtwork />
      </div>
    </section>
  )
}
