interface TVCLogoProps {
  size?: number;
  className?: string;
}

export function TVCLogo({ size = 56, className = "" }: TVCLogoProps) {
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
        T — bold letter
        crossbar: x=4–38, y=40–58   (width=34, height=18)
        stem:     x=15–27, y=58–88  (width=12)
      */}
      <path d="M 4,40 H 38 V 58 H 27 V 88 H 15 V 58 H 4 Z" fill="white" />

      {/*
        Green V/checkmark — FILLED POLYGON so it reads as a letter V
        Left arm:   outer top-left (38,50) → tip (61,92)  — angled ~61° (V angle)
        Right arm:  tip (61,92) → outer top-right (91,20)  — steep ~67° (tick/check)
        Right arm top width: 81–91
        Left arm top width:  38–48
        Inner valley at y=88 gives a sharp pointed bottom
      */}
      <polygon
        points="38,50 61,92 91,20 81,20 63,88 59,88 48,50"
        fill="#22c55e"
      />

      {/*
        C — bold ring arc
        centre=(97,64), outer-r=22, inner-r=13, gap ±65° from right
        outer gap:  upper=(106,44)  lower=(106,84)
        inner gap:  upper=(103,52)  lower=(103,76)
      */}
      <path
        d="M 106,84 A 22,22 0 1 1 106,44 L 103,52 A 13,13 0 1 0 103,76 Z"
        fill="white"
      />
    </svg>
  );
}
