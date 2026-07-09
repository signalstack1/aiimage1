interface TVCLogoProps {
  size?: number;
  className?: string;
}

export function TVCLogo({ size = 32, className = "" }: TVCLogoProps) {
  const r = size / 40;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="TVC Secured"
    >
      {/* Dark navy background */}
      <rect width="40" height="40" rx="8" fill="#0f172a" />

      {/* "t" */}
      <text
        x="4"
        y="27"
        fontFamily="Inter, ui-sans-serif, sans-serif"
        fontSize="15"
        fontWeight="700"
        fill="white"
        letterSpacing="-0.5"
      >
        t
      </text>

      {/* "v" */}
      <text
        x="12"
        y="27"
        fontFamily="Inter, ui-sans-serif, sans-serif"
        fontSize="15"
        fontWeight="700"
        fill="white"
        letterSpacing="-0.5"
      >
        v
      </text>

      {/* "c" — green circle with checkmark */}
      <circle cx="30" cy="20" r="8" stroke="#22c55e" strokeWidth="2.5" fill="none" />
      <path
        d="M26.5 20.5 L29 23 L33.5 17"
        stroke="#22c55e"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}
