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
      {/* Dark navy background */}
      <rect width="120" height="120" rx="12" fill="#0d1b2e" />

      {/*
        T — bold letter drawn as paths
        crossbar: x=14–56, y=40–58  (height=18, width=42)
        stem:     x=28–44, y=58–88  (width=16, height=30)
      */}
      <path d="M 14,40 H 56 V 58 H 44 V 88 H 28 V 58 H 14 Z" fill="white" />

      {/*
        Green checkmark — replaces V, dominant center element
        left arm:  (50,66) short diagonal going down-right to elbow
        elbow:     (72,90) at baseline
        right arm: steep up-right to (82,22), well above T cap height
      */}
      <polyline
        points="50,66 72,90 82,22"
        stroke="#22c55e"
        strokeWidth="16"
        strokeLinecap="butt"
        strokeLinejoin="miter"
        fill="none"
      />

      {/*
        C — bold ring arc, opening on the right
        center=(90,64), outer-r=24, inner-r=14, gap ±65° from horizontal right

        Outer gap corners:  upper=(100,42)  lower=(100,86)
        Inner gap corners:  upper=(96,51)   lower=(96,77)

        SVG arc notes:
          sweep=1 (clockwise on screen) traces the correct left-side arc
          for outer boundary starting from lower gap going to upper gap.
          sweep=0 (counterclockwise) traces back on the inner boundary.
      */}
      <path
        d="M 100,86 A 24,24 0 1 1 100,42 L 96,51 A 14,14 0 1 0 96,77 Z"
        fill="white"
      />
    </svg>
  );
}
