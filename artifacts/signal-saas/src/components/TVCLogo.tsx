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
      aria-label="TVC Approved"
    >
      <rect width="120" height="120" rx="12" fill="#0d1b2e" />

      {/* T — bold white, left */}
      <text
        x="4"
        y="84"
        fontFamily="Arial Black, Impact, ui-sans-serif, sans-serif"
        fontSize="52"
        fontWeight="900"
        fill="white"
      >T</text>

      {/* Green checkmark — big, replaces V, right arm extends above cap height */}
      <polyline
        points="28,64 52,88 94,10"
        stroke="#22c55e"
        strokeWidth="18"
        strokeLinecap="butt"
        strokeLinejoin="miter"
        fill="none"
      />

      {/* C — bold white, right */}
      <text
        x="74"
        y="84"
        fontFamily="Arial Black, Impact, ui-sans-serif, sans-serif"
        fontSize="52"
        fontWeight="900"
        fill="white"
      >C</text>
    </svg>
  );
}
