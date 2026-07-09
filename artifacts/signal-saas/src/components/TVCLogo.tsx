interface TVCLogoProps {
  size?: number;
  className?: string;
}

export function TVCLogo({ size = 40, className = "" }: TVCLogoProps) {
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
      {/* Dark navy background */}
      <rect width="120" height="120" rx="12" fill="#0d1b2e" />

      {/*
        T — left side, narrower to leave room in the middle
        crossbar: x=6–40, y=40–58  (width=34, height=18)
        stem:     x=17–29, y=58–88 (width=12)
      */}
      <path d="M 6,40 H 40 V 58 H 29 V 88 H 17 V 58 H 6 Z" fill="white" />

      {/*
        Green checkmark — fills the wide center gap
        left arm:  (36,65) → elbow (57,90)   short angled stroke
        right arm: (57,90) → (88,22)         steep, extends above T
        strokeWidth=16 for bold proportions
      */}
      <polyline
        points="36,65 57,90 88,22"
        stroke="#22c55e"
        strokeWidth="16"
        strokeLinecap="butt"
        strokeLinejoin="miter"
        fill="none"
      />

      {/*
        C — right side, centre=(97,64), outer-r=21, inner-r=13
        gap ±65° from horizontal right
        outer gap:  upper=(106,45)  lower=(106,83)
        inner gap:  upper=(103,52)  lower=(103,76)
      */}
      <path
        d="M 106,83 A 21,21 0 1 1 106,45 L 103,52 A 13,13 0 1 0 103,76 Z"
        fill="white"
      />
    </svg>
  );
}
