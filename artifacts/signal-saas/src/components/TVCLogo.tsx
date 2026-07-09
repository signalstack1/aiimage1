interface TVCLogoProps {
  size?: number;
  className?: string;
}

export function TVCLogo({ size = 32, className = "" }: TVCLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="TVC Secured"
    >
      {/* Dark navy background */}
      <rect width="120" height="120" rx="12" fill="#0d1b2e" />

      {/* T — bold white */}
      <text
        x="8"
        y="86"
        fontFamily="Arial Black, Impact, ui-sans-serif, sans-serif"
        fontSize="62"
        fontWeight="900"
        fill="white"
      >T</text>

      {/* Green checkmark — replaces the V */}
      {/*
        Bottom elbow point ~(57, 82)
        Left short arm up-left to ~(38, 64)
        Right long arm up-right to ~(76, 24) extending above letters
        Stroke-width style: polygon approximation ~9px thick
      */}
      <polygon
        points="34,64 42,56 58,76 76,20 84,26 60,84 42,84"
        fill="#22c55e"
      />

      {/* C — bold white */}
      <text
        x="72"
        y="86"
        fontFamily="Arial Black, Impact, ui-sans-serif, sans-serif"
        fontSize="62"
        fontWeight="900"
        fill="white"
      >C</text>
    </svg>
  );
}
