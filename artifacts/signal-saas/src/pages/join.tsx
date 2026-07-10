import { useState, useRef } from "react";
import { Link } from "wouter";
import { TVCLogo } from "@/components/TVCLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  ShieldCheck, CheckCircle2, Award,
  Sticker, ArrowRight, ExternalLink, Upload, AlertCircle, MapPin, HelpCircle,
} from "lucide-react";

const BASE_URL = import.meta.env.VITE_API_URL || "";

// ── Plan config ──────────────────────────────────────────────────────────────

const PLANS = [
  {
    code: "tvc_basic" as const,
    name: "TVC Basic",
    price: 15,
    pricePence: 1500,
    paymentSlug: "tvc-basic",
    badge: null,
    features: [
      "Unique TVC number assigned",
      "Public TVC verified profile",
      "Digital verification badge",
      "Member dashboard access",
      "Referral code",
      "Cancel anytime",
    ],
  },
  {
    code: "tvc_plus" as const,
    name: "TVC Plus",
    price: 30,
    pricePence: 3000,
    paymentSlug: "tvc-plus",
    badge: "Most Popular",
    features: [
      "Everything in TVC Basic",
      "Portfolio & photo gallery",
      "Intro video embed",
      "Social media links on profile",
      "Customer testimonials section",
      "Priority verification (same/next day)",
      "Enhanced public profile",
    ],
  },
] as const;

type PlanCode = "tvc_basic" | "tvc_plus";

const STICKER_OPTIONS = [
  { size: "none" as const,   label: "No stickers",         pricePerVan: 0,  desc: "Skip for now — you can order later." },
  { size: "small" as const,  label: "Small sticker pack",  pricePerVan: 30, desc: "Smaller format TVC stickers for your vehicle." },
  { size: "medium" as const, label: "Medium sticker pack", pricePerVan: 50, desc: "Larger, high-visibility TVC stickers for your vehicle." },
];

type StickerSize = "none" | "small" | "medium";

// ── Helpers ──────────────────────────────────────────────────────────────────

async function fetchPaymentLinks(): Promise<Array<{ slug: string; url: string | null }>> {
  try {
    const res = await fetch(`${BASE_URL}/api/payment-links`);
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

const TRADE_TYPES = [
  "Electrician", "Plumber", "Gas Engineer", "Builder", "Roofer",
  "Painter & Decorator", "Carpenter / Joiner", "Plasterer",
  "Tiler", "Flooring Specialist", "Landscaper / Gardener",
  "Locksmith", "Heating Engineer", "Solar / Renewable",
  "Kitchen Fitter", "Bathroom Fitter", "Other",
];

const JOIN_DOC_SECTIONS = [
  { type: "insurance",        icon: ShieldCheck, label: "Public Liability Insurance",  desc: "Certificate of public liability insurance. PDF or image, max 10 MB." },
  { type: "accreditation",    icon: Award,       label: "Trade Accreditations",         desc: "Gas Safe, NICEIC, NAPIT, trust mark or any other trade body certificate." },
  { type: "proof_of_address", icon: MapPin,      label: "Proof of Business Address",   desc: "Utility bill, bank statement, or council letter dated within 3 months." },
  { type: "other",            icon: HelpCircle,  label: "Other Supporting Documents",  desc: "Companies House certificate, ID, or any other relevant evidence." },
] as const;

// ── Sub-components ───────────────────────────────────────────────────────────

function PublicNav() {
  return (
    <header className="fixed top-0 inset-x-0 z-50 border-b border-border/60 bg-background/90 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-6 py-2 flex items-center justify-between">
        <div className="flex flex-col items-center">
          <TVCLogo size={131} />
          <span className="text-xs font-semibold tracking-wide whitespace-nowrap mt-1">
            Trades <span style={{ color: "hsl(142, 71%, 45%)" }}>|</span> Verified <span style={{ color: "hsl(142, 71%, 45%)" }}>|</span> Checked
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors font-medium">Login</Link>
          <Button size="sm" className="gradient-brand text-white border-0 hover:opacity-90 font-semibold" asChild>
            <Link href="/join">Apply Now</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

function PublicFooter() {
  return (
    <footer className="border-t border-border py-8 px-6">
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
        <TVCLogo size={74} />
        <div className="flex items-center gap-6">
          <Link href="/verify" className="hover:text-foreground transition-colors">Verify</Link>
          <Link href="/join" className="hover:text-foreground transition-colors">Join</Link>
          <Link href="/contact" className="hover:text-foreground transition-colors">Contact</Link>
        </div>
        <p>© {new Date().getFullYear()} TVC Secured Ltd. All rights reserved.</p>
      </div>
    </footer>
  );
}

function StepBadge({ current, planCode }: { current: string; planCode: PlanCode | null }) {
  if (!planCode) return null;
  const plan = PLANS.find((p) => p.code === planCode);
  if (!plan) return null;
  return (
    <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 text-sm font-medium text-primary mb-6">
      <CheckCircle2 className="w-3.5 h-3.5" />
      {plan.name} — £{plan.price}/month selected
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface ApplicationForm {
  name: string;
  business_name: string;
  trade_type: string;
  location: string;
  website: string;
  email: string;
  phone: string;
  message: string;
  password: string;
}

const EMPTY_FORM: ApplicationForm = {
  name: "", business_name: "", trade_type: "", location: "",
  website: "", email: "", phone: "", message: "", password: "",
};

type Step = "plan" | "form" | "sticker" | "payment" | "documents" | "done";

export default function JoinPage() {
  const [step, setStep] = useState<Step>("plan");
  const [planCode, setPlanCode] = useState<PlanCode | null>(null);
  const [form, setForm] = useState<ApplicationForm>(EMPTY_FORM);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [stickerSize, setStickerSize] = useState<StickerSize>("none");
  const [vanCount, setVanCount] = useState(1);
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [stickerPaymentUrl, setStickerPaymentUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [stickerSubmitting, setStickerSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joinDocs, setJoinDocs] = useState<Record<string, Array<{ id: string; file_name: string }>>>({});
  const [joinUploading, setJoinUploading] = useState<Record<string, boolean>>({});
  const [joinErrors, setJoinErrors] = useState<Record<string, string>>({});
  const joinInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const update = (field: keyof ApplicationForm) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const bufferToBase64 = (buffer: ArrayBuffer): string => {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    const CHUNK = 8192;
    for (let i = 0; i < bytes.length; i += CHUNK) {
      binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
    }
    return btoa(binary);
  };

  const handleJoinDocUpload = async (docType: string, file: File) => {
    if (!applicationId) return;
    const mb = file.size / (1024 * 1024);
    if (mb > 10) {
      setJoinErrors((e) => ({ ...e, [docType]: `File too large (${mb.toFixed(1)} MB). Max 10 MB.` }));
      return;
    }
    setJoinErrors((e) => ({ ...e, [docType]: "" }));
    setJoinUploading((u) => ({ ...u, [docType]: true }));
    try {
      const buffer = await file.arrayBuffer();
      const base64 = bufferToBase64(buffer);
      const res = await fetch(`${BASE_URL}/api/via/applications/${applicationId}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file_data: base64, mime_type: file.type, file_name: file.name, document_type: docType }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Upload failed");
      }
      const doc = await res.json();
      setJoinDocs((prev) => ({
        ...prev,
        [docType]: [...(prev[docType] || []), { id: doc.id, file_name: file.name }],
      }));
    } catch (e: any) {
      setJoinErrors((prev) => ({ ...prev, [docType]: e.message || "Upload failed" }));
    } finally {
      setJoinUploading((u) => ({ ...u, [docType]: false }));
      if (joinInputRefs.current[docType]) joinInputRefs.current[docType]!.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.business_name || !form.trade_type || !form.email) {
      setError("Please fill in all required fields.");
      return;
    }
    if (!form.password || form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (form.password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const selectedPlan = PLANS.find((p) => p.code === planCode)!;
      const res = await fetch(`${BASE_URL}/api/via/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, plan_code: planCode, plan_price_pence: selectedPlan.pricePence }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Submission failed");
      }
      const data = await res.json();
      setApplicationId(data.id || null);
      setPaymentUrl(data.payment_url || null);
      setStep("sticker");
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStickerContinue = async () => {
    if (stickerSize === "none") {
      setStep("payment");
      return;
    }
    if (!applicationId || vanCount < 1) return;
    setStickerSubmitting(true);
    try {
      const stickerOpt = STICKER_OPTIONS.find((o) => o.size === stickerSize)!;
      const res = await fetch(`${BASE_URL}/api/via/sticker-orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          application_id: applicationId,
          sticker_size: stickerSize,
          van_count: vanCount,
          price_per_van_pence: stickerOpt.pricePerVan * 100,
          expected_total_pence: stickerOpt.pricePerVan * vanCount * 100,
        }),
      });
      if (res.ok) {
        const links = await fetchPaymentLinks();
        const slug = stickerSize === "small" ? "sticker-small" : "sticker-medium";
        const found = links.find((l) => l.slug === slug);
        setStickerPaymentUrl(found?.url ?? null);
      }
    } catch {
      // non-fatal — still proceed
    } finally {
      setStickerSubmitting(false);
    }
    setStep("payment");
  };

  const selectedPlan = planCode ? PLANS.find((p) => p.code === planCode) : null;
  const stickerOpt = STICKER_OPTIONS.find((o) => o.size === stickerSize)!;
  const stickerTotal = stickerSize !== "none" ? stickerOpt.pricePerVan * vanCount : 0;

  // ── Step: Plan selection ─────────────────────────────────────────────────────

  if (step === "plan") {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <PublicNav />
        <div className="flex-1 px-6 pt-32 pb-20">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-10">
              <Badge variant="outline" className="mb-4 border-primary/30 text-primary bg-primary/5 px-3 py-1 text-xs font-medium">
                <ShieldCheck className="w-3 h-3 mr-1.5" />
                Join TVC Secured
              </Badge>
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
                Choose your plan
              </h1>
              <p className="text-muted-foreground text-lg max-w-xl mx-auto leading-relaxed">
                Both plans include your unique TVC number, verified public profile, and digital badge. Cancel anytime.
              </p>
            </div>

            {/* Plan cards */}
            <div className="grid md:grid-cols-2 gap-6 mb-10">
              {PLANS.map((plan) => (
                <button
                  key={plan.code}
                  onClick={() => { setPlanCode(plan.code); setStep("form"); }}
                  className={`text-left bg-card border rounded-2xl p-7 relative transition-all hover:border-primary/60 hover:shadow-lg ${
                    plan.badge ? "border-primary/40 shadow-primary/5 shadow-md" : "border-border"
                  }`}
                >
                  {plan.badge && (
                    <div className="absolute top-4 right-4">
                      <Badge className="gradient-brand text-white border-0 text-xs font-semibold">
                        {plan.badge}
                      </Badge>
                    </div>
                  )}
                  <div className="mb-5">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">{plan.name}</p>
                    <div className="flex items-end gap-1.5">
                      <span className="text-4xl font-extrabold">£{plan.price}</span>
                      <span className="text-muted-foreground mb-1.5 text-sm">/month</span>
                    </div>
                  </div>
                  <ul className="space-y-2.5 mb-6">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <div className={`w-full h-11 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold ${
                    plan.badge
                      ? "gradient-brand text-white"
                      : "bg-primary/10 text-primary border border-primary/20"
                  }`}>
                    Select {plan.name}
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </button>
              ))}
            </div>

            {/* Sticker packs info */}
            <div className="bg-card border border-border rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                  <Sticker className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Optional: TVC Van Sticker Packs</p>
                  <p className="text-xs text-muted-foreground">One-time add-on — not included in membership</p>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="bg-muted/30 rounded-xl px-4 py-3">
                  <p className="font-semibold text-sm">Small Sticker Pack</p>
                  <p className="text-xs text-muted-foreground mt-0.5">£30 per van — smaller format TVC stickers</p>
                </div>
                <div className="bg-muted/30 rounded-xl px-4 py-3">
                  <p className="font-semibold text-sm">Medium Sticker Pack</p>
                  <p className="text-xs text-muted-foreground mt-0.5">£50 per van — larger, high-visibility stickers</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3">You'll be offered stickers during the application — no need to decide now.</p>
            </div>
          </div>
        </div>
        <PublicFooter />
      </div>
    );
  }

  // ── Step: Application form ───────────────────────────────────────────────────

  if (step === "form") {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <PublicNav />
        <div className="flex-1 px-6 pt-32 pb-20">
          <div className="max-w-xl mx-auto">
            <div className="text-center mb-8">
              <StepBadge current={step} planCode={planCode} />
              <h1 className="text-3xl font-extrabold mb-2">Your details</h1>
              <p className="text-muted-foreground text-sm">Fill in your business and account information to apply.</p>
            </div>

            {error && (
              <div className="bg-destructive/10 border border-destructive/30 text-destructive text-sm rounded-lg px-4 py-3 mb-5">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="name">Your name <span className="text-destructive">*</span></Label>
                  <Input id="name" value={form.name} onChange={update("name")} placeholder="Jane Smith" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="business_name">Business name <span className="text-destructive">*</span></Label>
                  <Input id="business_name" value={form.business_name} onChange={update("business_name")} placeholder="Smith Electrical Ltd" required />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="trade_type">Trade type <span className="text-destructive">*</span></Label>
                <select
                  id="trade_type"
                  value={form.trade_type}
                  onChange={update("trade_type")}
                  required
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Select trade…</option>
                  {TRADE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="location">Town / city <span className="text-destructive">*</span></Label>
                <Input id="location" value={form.location} onChange={update("location")} placeholder="Birmingham" required />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email <span className="text-destructive">*</span></Label>
                  <Input id="email" type="email" value={form.email} onChange={update("email")} placeholder="jane@example.co.uk" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" type="tel" value={form.phone} onChange={update("phone")} placeholder="07700 900000" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="website">Website (optional)</Label>
                <Input id="website" type="url" value={form.website} onChange={update("website")} placeholder="https://smithelectrical.co.uk" />
              </div>

              <div className="border-t border-border pt-4 space-y-4">
                <p className="text-sm font-semibold text-muted-foreground">Create your account</p>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="password">Password <span className="text-destructive">*</span></Label>
                    <Input id="password" type="password" value={form.password} onChange={update("password")} placeholder="Min. 8 characters" required minLength={8} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="confirm_password">Confirm password <span className="text-destructive">*</span></Label>
                    <Input id="confirm_password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repeat password" required />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="message">Anything else you'd like us to know? (optional)</Label>
                <textarea
                  id="message"
                  value={form.message}
                  onChange={update("message")}
                  rows={3}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                  placeholder="Additional context for your application…"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setStep("plan")}>
                  Back
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 gradient-brand text-white border-0 hover:opacity-90 font-semibold"
                >
                  {submitting ? "Creating account…" : "Create account & continue"}
                  {!submitting && <ArrowRight className="w-4 h-4 ml-2" />}
                </Button>
              </div>

              <p className="text-xs text-muted-foreground text-center">
                By applying you agree to our{" "}
                <Link href="/terms" className="underline hover:text-foreground">Terms</Link> and{" "}
                <Link href="/privacy" className="underline hover:text-foreground">Privacy Policy</Link>.
              </p>
            </form>
          </div>
        </div>
        <PublicFooter />
      </div>
    );
  }

  // ── Step: Sticker add-on ─────────────────────────────────────────────────────

  if (step === "sticker") {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <PublicNav />
        <div className="flex-1 px-6 pt-32 pb-20">
          <div className="max-w-lg mx-auto">
            <div className="text-center mb-8">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-4">
                <Sticker className="w-7 h-7 text-amber-400" />
              </div>
              <StepBadge current={step} planCode={planCode} />
              <h1 className="text-2xl font-extrabold mb-2">Add TVC van stickers?</h1>
              <p className="text-muted-foreground text-sm max-w-sm mx-auto">
                TVC stickers on your vehicle are one of the most visible trust signals in the trade. One-time cost per van.
              </p>
            </div>

            <div className="space-y-3 mb-6">
              {STICKER_OPTIONS.map((opt) => (
                <button
                  key={opt.size}
                  onClick={() => setStickerSize(opt.size)}
                  className={`w-full text-left rounded-xl border p-4 transition-all ${
                    stickerSize === opt.size
                      ? "border-primary bg-primary/5"
                      : "border-border bg-card hover:border-primary/40"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-sm">{opt.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      {opt.size !== "none" && (
                        <span className="text-sm font-bold text-foreground">£{opt.pricePerVan}/van</span>
                      )}
                      <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${
                        stickerSize === opt.size ? "border-primary bg-primary" : "border-border"
                      }`} />
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {stickerSize !== "none" && (
              <div className="bg-card border border-border rounded-xl p-4 mb-6 space-y-3">
                <Label htmlFor="van_count">How many vans?</Label>
                <div className="flex items-center gap-3">
                  <Input
                    id="van_count"
                    type="number"
                    min={1}
                    step={1}
                    value={vanCount}
                    onChange={(e) => setVanCount(Math.max(1, Math.floor(Number(e.target.value))))}
                    className="w-24"
                  />
                  <span className="text-sm text-muted-foreground">
                    × £{stickerOpt.pricePerVan}/van
                  </span>
                </div>
                <div className="bg-primary/5 border border-primary/20 rounded-lg px-4 py-3 flex items-center justify-between">
                  <span className="text-sm font-semibold">Sticker total</span>
                  <span className="text-lg font-extrabold text-primary">£{stickerTotal}</span>
                </div>
                <p className="text-xs text-muted-foreground">Payment for stickers is separate from your membership. You'll receive a payment link after applying.</p>
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setStep("payment")}>
                Skip stickers
              </Button>
              <Button
                className="flex-1 gradient-brand text-white border-0 hover:opacity-90 font-semibold"
                onClick={handleStickerContinue}
                disabled={stickerSubmitting}
              >
                {stickerSubmitting ? "Saving…" : stickerSize === "none" ? "Continue" : `Add stickers — £${stickerTotal}`}
                {!stickerSubmitting && <ArrowRight className="w-4 h-4 ml-2" />}
              </Button>
            </div>
          </div>
        </div>
        <PublicFooter />
      </div>
    );
  }

  // ── Step: Payment ────────────────────────────────────────────────────────────

  if (step === "payment") {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <PublicNav />
        <div className="flex-1 flex items-center justify-center px-6 py-24">
          <div className="max-w-md w-full text-center">
            <div className="w-16 h-16 rounded-2xl gradient-brand flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-extrabold mb-4">Account created!</h1>
            <p className="text-muted-foreground mb-6 leading-relaxed">
              Your TVC account is set up. Complete payment below to begin verification. You can sign in at any time using your email and password.
            </p>

            <div className="bg-card border border-border rounded-2xl p-6 mb-6 text-left space-y-3">
              <p className="text-sm font-semibold mb-2">What happens next?</p>
              {[
                "Complete membership payment using the button below",
                "Upload your verification documents (now or later)",
                "Our team runs your 6 independent checks",
                "You receive your TVC number and public profile once approved",
              ].map((s, i) => (
                <div key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
                  <div className="w-5 h-5 rounded-full bg-primary/15 text-primary flex items-center justify-center shrink-0 text-xs font-bold mt-0.5">{i + 1}</div>
                  {s}
                </div>
              ))}
            </div>

            {/* Membership payment */}
            {paymentUrl ? (
              <Button
                className="w-full gradient-brand text-white border-0 hover:opacity-90 font-semibold h-11 mb-3"
                onClick={() => window.open(paymentUrl!, "_blank", "noopener")}
              >
                Pay {selectedPlan?.name} — £{selectedPlan?.price}/month
                <ExternalLink className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-sm text-amber-300 mb-3">
                Payment link not yet configured. Contact us and we'll send the payment link directly.
              </div>
            )}

            {/* Sticker payment */}
            {stickerSize !== "none" && (
              <div className="bg-card border border-amber-500/20 rounded-xl p-4 mb-3">
                <p className="text-xs font-semibold text-amber-400 mb-2 flex items-center gap-1.5">
                  <Sticker className="w-3.5 h-3.5" />
                  Sticker order — £{stickerTotal}
                </p>
                {stickerPaymentUrl ? (
                  <Button
                    variant="outline"
                    className="w-full border-amber-500/30 text-amber-300 hover:bg-amber-500/10"
                    onClick={() => window.open(stickerPaymentUrl!, "_blank", "noopener")}
                  >
                    Pay for stickers — £{stickerTotal}
                    <ExternalLink className="w-4 h-4 ml-2" />
                  </Button>
                ) : (
                  <p className="text-xs text-muted-foreground">Sticker payment link not yet configured. We'll contact you separately.</p>
                )}
              </div>
            )}

            <Button variant="outline" className="w-full mb-3" onClick={() => setStep("documents")}>
              Upload documents first
            </Button>
            <Button variant="ghost" className="w-full text-sm" asChild>
              <Link href="/login">Sign in to your account →</Link>
            </Button>
          </div>
        </div>
        <PublicFooter />
      </div>
    );
  }

  // ── Step: Documents ──────────────────────────────────────────────────────────

  if (step === "documents") {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <PublicNav />
        <div className="flex-1 px-6 py-16 max-w-2xl mx-auto w-full">
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-2xl gradient-brand flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-extrabold mb-2">Upload documents</h1>
            <p className="text-muted-foreground text-sm leading-relaxed max-w-md mx-auto">
              Upload your verification documents below to speed up the process. You can also skip and upload these later from your dashboard.
            </p>
          </div>

          <div className="space-y-4">
            {JOIN_DOC_SECTIONS.map(({ type, icon: Icon, label, desc }) => {
              const uploaded = joinDocs[type] || [];
              const isUploading = joinUploading[type] ?? false;
              return (
                <div key={type} className="bg-card border border-border rounded-2xl p-5">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                        <Icon className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isUploading}
                      onClick={() => joinInputRefs.current[type]?.click()}
                      className="shrink-0"
                    >
                      <Upload className="w-3.5 h-3.5 mr-1.5" />
                      {isUploading ? "Uploading…" : "Upload"}
                    </Button>
                    <input
                      ref={(el) => { joinInputRefs.current[type] = el; }}
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.webp"
                      className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleJoinDocUpload(type, f); }}
                    />
                  </div>
                  {joinErrors[type] && (
                    <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2 mb-2">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      {joinErrors[type]}
                    </div>
                  )}
                  {uploaded.length > 0 && (
                    <div className="space-y-1.5 mt-2">
                      {uploaded.map((d) => (
                        <div key={d.id} className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 rounded-lg px-3 py-2">
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate font-medium">{d.file_name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mt-6">
            <Button variant="outline" className="flex-1" onClick={() => setStep("done")}>
              Skip — I'll upload later
            </Button>
            <Button
              className="flex-1 gradient-brand text-white border-0 hover:opacity-90 font-semibold"
              onClick={() => setStep("done")}
            >
              Done uploading
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
          <p className="text-center text-xs text-muted-foreground mt-4">
            Documents are stored securely and only visible to TVC verifiers. PDF, JPG, PNG and WebP accepted (max 10 MB each).
          </p>
        </div>
        <PublicFooter />
      </div>
    );
  }

  // ── Step: Done ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <PublicNav />
      <div className="flex-1 flex items-center justify-center px-6 py-24">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-2xl gradient-brand flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold mb-4">You're all set!</h1>
          <p className="text-muted-foreground mb-6 leading-relaxed">
            Your documents have been submitted. Once payment is confirmed, our team will begin your 6 independent checks.
          </p>
          {paymentUrl && (
            <Button
              className="w-full gradient-brand text-white border-0 hover:opacity-90 font-semibold h-11 mb-3"
              onClick={() => window.open(paymentUrl!, "_blank", "noopener")}
            >
              Complete payment — £{selectedPlan?.price}/month
              <ExternalLink className="w-4 h-4 ml-2" />
            </Button>
          )}
          <Button variant="outline" asChild className="w-full mb-3">
            <Link href="/login">Sign in to your dashboard</Link>
          </Button>
          <Button variant="ghost" asChild className="w-full text-sm">
            <Link href="/">Back to home</Link>
          </Button>
        </div>
      </div>
      <PublicFooter />
    </div>
  );
}
