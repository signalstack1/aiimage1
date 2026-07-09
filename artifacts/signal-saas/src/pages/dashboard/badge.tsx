import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Copy, CheckCircle2, AlertTriangle } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { APP_CONFIG } from "@/config/app";

// ── TVC Badge SVG component ───────────────────────────────────────────────────

function ViaBadgeSvg({ viaNumber, businessName, tradeType }: {
  viaNumber: string;
  businessName: string;
  tradeType: string;
}) {
  return (
    <svg
      viewBox="0 0 320 220"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full max-w-xs"
    >
      {/* Background */}
      <rect width="320" height="220" rx="16" fill="#0d1f35" />
      {/* Green accent bar */}
      <rect width="320" height="5" rx="0" fill="#22c55e" />
      {/* Shield icon */}
      <g transform="translate(28, 28)">
        <path
          d="M20 2 L36 8 L36 20 C36 28 28 34 20 38 C12 34 4 28 4 20 L4 8 Z"
          fill="none"
          stroke="#22c55e"
          strokeWidth="2"
        />
        <path
          d="M13 20 L18 25 L28 15"
          fill="none"
          stroke="#22c55e"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
      {/* TVC SECURED label */}
      <text x="80" y="38" fontFamily="Inter, sans-serif" fontSize="10" fontWeight="600" fill="#22c55e" letterSpacing="3">
        TVC SECURED
      </text>
      {/* TVC Number */}
      <text x="28" y="115" fontFamily="Inter, monospace" fontSize="40" fontWeight="800" fill="white" letterSpacing="1">
        {viaNumber}
      </text>
      {/* Business name */}
      <text x="28" y="140" fontFamily="Inter, sans-serif" fontSize="12" fontWeight="500" fill="#94a3b8">
        {businessName.length > 34 ? businessName.slice(0, 34) + "…" : businessName}
      </text>
      {/* Trade type */}
      <text x="28" y="158" fontFamily="Inter, sans-serif" fontSize="11" fill="#64748b">
        {tradeType}
      </text>
      {/* INDEPENDENTLY VERIFIED banner */}
      <rect x="28" y="174" width="172" height="22" rx="11" fill="#22c55e" fillOpacity="0.15" />
      <text x="38" y="188" fontFamily="Inter, sans-serif" fontSize="9" fontWeight="700" fill="#22c55e" letterSpacing="1.5">
        INDEPENDENTLY VERIFIED
      </text>
      {/* tvcsecured.co.uk */}
      <text x="220" y="210" fontFamily="Inter, sans-serif" fontSize="9" fill="#475569" textAnchor="end">
        tvcsecured.co.uk
      </text>
    </svg>
  );
}

function PendingBadge() {
  return (
    <div className="w-full max-w-xs border-2 border-dashed border-border rounded-2xl flex flex-col items-center justify-center p-12 text-center gap-3">
      <AlertTriangle className="w-8 h-8 text-muted-foreground/50" />
      <p className="text-sm font-semibold text-muted-foreground">Badge not available yet</p>
      <p className="text-xs text-muted-foreground leading-relaxed">Your digital badge will appear here once your TVC application is approved and your TVC number is assigned.</p>
    </div>
  );
}

export default function DashboardBadge() {
  const { member } = useAuth();
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [copied, setCopied] = useState(false);

  const viaNumber   = member?.business?.via_number;
  const businessName = member?.business?.business_name ?? "Business";
  const tradeType   = member?.business?.trade_type ?? "";
  const referralCode = member?.business?.referral_code;
  const isApproved  = member?.application?.status === "approved" && viaNumber;

  const downloadSvg = () => {
    if (!svgRef.current) return;
    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `TVC-badge-${viaNumber}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyReferral = () => {
    if (!referralCode) return;
    navigator.clipboard.writeText(referralCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <DashboardLayout>
      <div className="p-8 max-w-3xl">
        <h1 className="text-2xl font-extrabold mb-1">Badge & Referral</h1>
        <p className="text-muted-foreground mb-8">Download your digital TVC badge and share your referral code.</p>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Badge download */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <h2 className="font-bold mb-1">Your TVC Badge</h2>
            <p className="text-xs text-muted-foreground mb-5">
              Use on your website, email signature, quotes, and marketing materials.
            </p>

            <div className="flex justify-center mb-5">
              {isApproved ? (
                <svg
                  ref={svgRef}
                  viewBox="0 0 320 220"
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-full max-w-xs rounded-xl overflow-hidden"
                >
                  <rect width="320" height="220" rx="16" fill="#0d1f35" />
                  <rect width="320" height="5" rx="0" fill="#22c55e" />
                  <g transform="translate(28, 28)">
                    <path d="M20 2 L36 8 L36 20 C36 28 28 34 20 38 C12 34 4 28 4 20 L4 8 Z" fill="none" stroke="#22c55e" strokeWidth="2" />
                    <path d="M13 20 L18 25 L28 15" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </g>
                  <text x="80" y="38" fontFamily="Inter, sans-serif" fontSize="10" fontWeight="600" fill="#22c55e" letterSpacing="3">TVC SECURED</text>
                  <text x="28" y="115" fontFamily="Inter, monospace" fontSize="40" fontWeight="800" fill="white" letterSpacing="1">{viaNumber}</text>
                  <text x="28" y="140" fontFamily="Inter, sans-serif" fontSize="12" fontWeight="500" fill="#94a3b8">{businessName.length > 34 ? businessName.slice(0, 34) + "…" : businessName}</text>
                  <text x="28" y="158" fontFamily="Inter, sans-serif" fontSize="11" fill="#64748b">{tradeType}</text>
                  <rect x="28" y="174" width="172" height="22" rx="11" fill="#22c55e" fillOpacity="0.15" />
                  <text x="38" y="188" fontFamily="Inter, sans-serif" fontSize="9" fontWeight="700" fill="#22c55e" letterSpacing="1.5">INDEPENDENTLY VERIFIED</text>
                  <text x="220" y="210" fontFamily="Inter, sans-serif" fontSize="9" fill="#475569" textAnchor="end">tvcsecured.co.uk</text>
                </svg>
              ) : (
                <PendingBadge />
              )}
            </div>

            {isApproved && (
              <Button onClick={downloadSvg} className="w-full gradient-brand text-white border-0 hover:opacity-90 font-semibold">
                <Download className="w-4 h-4 mr-2" />
                Download badge (SVG)
              </Button>
            )}
          </div>

          {/* Referral code */}
          <div className="space-y-4">
            <div className="bg-card border border-border rounded-2xl p-6">
              <h2 className="font-bold mb-1">Your Referral Code</h2>
              <p className="text-xs text-muted-foreground mb-4">
                Share this code with other tradespeople. When they apply using your code, you both benefit.
              </p>

              {referralCode ? (
                <>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex-1 bg-background border border-border rounded-lg px-4 py-3">
                      <p className="font-mono text-lg font-bold tracking-widest text-primary">{referralCode}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={copyReferral}
                      className="shrink-0 h-12"
                    >
                      {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {copied ? "Copied to clipboard!" : "Click the copy button to copy your referral code."}
                  </p>
                </>
              ) : (
                <div className="bg-muted/30 border border-dashed border-border rounded-lg p-4 text-center">
                  <p className="text-sm text-muted-foreground">Referral code will appear once your profile is created.</p>
                </div>
              )}
            </div>

            <div className="bg-card border border-border rounded-2xl p-6">
              <h2 className="font-bold mb-3">Van sticker pack</h2>
              <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                Physical TVC stickers for your vehicle — one of the most visible trust signals in the trade. Included with your membership.
              </p>
              <Badge variant="outline" className="border-primary/30 text-primary bg-primary/5">
                Sent on approval
              </Badge>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
