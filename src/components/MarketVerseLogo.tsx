import type { SVGProps } from "react";

type MarketVerseLogoProps = SVGProps<SVGSVGElement> & {
  compact?: boolean;
};

export function MarketVerseLogo({ compact = false, ...props }: MarketVerseLogoProps) {
  return (
    <svg
      {...props}
      role="img"
      aria-labelledby="marketverse-logo-title marketverse-logo-description"
      viewBox={compact ? "0 0 232 52" : "0 0 420 92"}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <title id="marketverse-logo-title">MarketVerse</title>
      <desc id="marketverse-logo-description">MarketVerse, One Marketplace, Endless Choices</desc>

      <defs>
        <linearGradient id="marketverse-mark-gradient" x1="8" y1="4" x2="46" y2="48" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6366F1" />
          <stop offset="1" stopColor="#4338CA" />
        </linearGradient>
      </defs>

      <g transform={compact ? "translate(2 4) scale(.92)" : "translate(4 8) scale(1.5)"}>
        <rect width="44" height="44" rx="13" fill="url(#marketverse-mark-gradient)" />
        <path d="M11 19.5h22l-2.1 17H13.1L11 19.5Z" fill="white" fillOpacity=".96" />
        <path d="M14.5 19.5a7.5 7.5 0 0 1 15 0" stroke="white" strokeWidth="2.6" strokeLinecap="round" />
        <path d="M16 25.5h12M16 30h8" stroke="#6366F1" strokeWidth="2" strokeLinecap="round" />
        <circle cx="33.5" cy="12" r="5.5" fill="#10B981" />
        <path d="m31.3 12 1.5 1.5 2.9-3.2" stroke="white" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      </g>

      <text
        x={compact ? "52" : "82"}
        y={compact ? "26" : "43"}
        fill="currentColor"
        fontFamily="Trebuchet MS, Segoe UI, sans-serif"
        fontSize={compact ? "20" : "34"}
        fontWeight="800"
        letterSpacing="-.6"
      >
        Market<tspan fill="#6366F1">Verse</tspan>
      </text>
      <text
        x={compact ? "53" : "84"}
        y={compact ? "43" : "68"}
        fill="currentColor"
        fillOpacity=".58"
        fontFamily="Trebuchet MS, Segoe UI, sans-serif"
        fontSize={compact ? "7.5" : "12"}
        fontWeight="600"
        letterSpacing={compact ? ".2" : ".35"}
      >
        One Marketplace, Endless Choices
      </text>
    </svg>
  );
}
