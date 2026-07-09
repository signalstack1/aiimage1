interface TVCLogoProps {
  size?: number;
  className?: string;
}

export function TVCLogo({ size = 56, className = "" }: TVCLogoProps) {
  return (
    <img
      src="/tvc-logo.png"
      alt="TVC Approved"
      width={size}
      height={size}
      style={{ objectFit: "contain" }}
      className={className}
    />
  );
}
