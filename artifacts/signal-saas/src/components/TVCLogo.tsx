interface TVCLogoProps {
  size?: number;
  className?: string;
  tagline?: boolean;
}

export function TVCLogo({ size = 56, className = "", tagline = false }: TVCLogoProps) {
  if (!tagline) {
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

  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      <img
        src="/tvc-logo.png"
        alt="TVC Approved"
        width={size}
        height={size}
        style={{ objectFit: "contain" }}
      />
      <p className="text-white font-semibold tracking-wide text-sm select-none">
        Trades{" "}
        <span className="text-emerald-400">|</span>
        {" "}Verified{" "}
        <span className="text-emerald-400">|</span>
        {" "}Checked
      </p>
    </div>
  );
}
