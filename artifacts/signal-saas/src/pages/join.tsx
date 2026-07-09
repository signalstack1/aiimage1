import { useState, useRef } from "react";
import { Link } from "wouter";
import { TVCLogo } from "@/components/TVCLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  ShieldCheck, CheckCircle2, Award, Star, Hash,
  Sticker, ArrowRight, ExternalLink, Upload, FileText, AlertCircle, MapPin, HelpCircle,
} from "lucide-react";
import { APP_CONFIG } from "@/config/app";

const BASE_URL = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

const BENEFITS = [
  { icon: Hash,        title: "Unique TVC Number",     desc: "Your own TVC number (e.g. TVC1042) — searchable by the public and displayed on your profile." },
  { icon: ShieldCheck, title: "Public TVC Profile",    desc: "A verified public page showing your checks, trade type, location, and verification status." },
  { icon: Award,       title: "Digital Badge",         desc: "A TVC verification badge to use on your website, quotes, and marketing materials." },
  { icon: Sticker,     title: "TVC Van Sticker Pack",  desc: "Printed TVC stickers for your vehicle — one of the most visible trust signals in the trade." },
  { icon: Star,        title: "Competitive Edge",      desc: "Stand out from unverified tradespeople when customers are comparing quotes." },
];

interface PaymentLink {
  slug: string;
  label: string;
  url: string | null;
}

async function fetchPaymentLinks(): Promise<PaymentLink[]> {
  try {
    const res = await fetch(`${BASE_URL}/api/payment-links`);
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

function PaymentButton({ slug, label, className = "" }: { slug: string; label: string; className?: string }) {
  const [loading, setLoading] = useState(false);
  const [url, setUrl] = useState<string | null | "unconfigured">(null);
  const [fetched, setFetched] = useState(false);

  const handleClick = async () => {
    if (!fetched) {
      setLoading(true);
      const links = await fetchPaymentLinks();
      const found = links.find((l) => l.slug === slug);
      const resolvedUrl = found?.url ?? null;
      setUrl(resolvedUrl ?? "unconfigured");
      setFetched(true);
      setLoading(false);
      if (resolvedUrl) {
        window.open(resolvedUrl, "_blank", "noopener");
      }
    } else if (url && url !== "unconfigured") {
      window.open(url, "_blank", "noopener");
    }
  };

  if (url === "unconfigured") {
    return (
      <p className="text-sm text-muted-foreground text-center py-2">Payment link not configured yet.</p>
    );
  }

  return (
    <Button
      onClick={handleClick}
      disabled={loading}
      className={`w-full font-semibold ${className}`}
    >
      {loading ? "Loading…" : label}
      {!loading && <ExternalLink className="w-4 h-4 ml-2" />}
    </Button>
  );
}

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

const TRADE_TYPES = [
  "Electrician", "Plumber", "Gas Engineer", "Builder", "Roofer",
  "Painter & Decorator", "Carpenter / Joiner", "Plasterer",
  "Tiler", "Flooring Specialist", "Landscaper / Gardener",
  "Locksmith", "Heating Engineer", "Solar / Renewable",
  "Kitchen Fitter", "Bathroom Fitter", "Other",
];

export default function JoinPage() {
  const [form, setForm] = useState<ApplicationForm>(EMPTY_FORM);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [step, setStep] = useState<"form" | "payment" | "documents" | "done">("form");
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
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
      const res = await fetch(`${BASE_URL}/api/via/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Submission failed");
      }
      const data = await res.json();
      setApplicationId(data.id || null);
      setPaymentUrl(data.payment_url || null);
      setStep("payment");
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const JOIN_DOC_SECTIONS = [
    { type: "insurance",        icon: ShieldCheck, label: "Public Liability Insurance",   desc: "Certificate of public liability insurance. PDF or image, max 10 MB." },
    { type: "accreditation",    icon: Award,       label: "Trade Accreditations",          desc: "Gas Safe, NICEIC, NAPIT, trust mark or any other trade body certificate." },
    { type: "proof_of_address", icon: MapPin,       label: "Proof of Business Address",    desc: "Utility bill, bank statement, or council letter dated within 3 months." },
    { type: "other",            icon: HelpCircle,  label: "Other Supporting Documents",   desc: "Companies House certificate, ID, or any other relevant evidence." },
  ] as const;

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
              Your TVC account has been created. Complete payment below to begin the verification process. You can sign in at any time using the email and password you just set.
            </p>
            <div className="bg-card border border-border rounded-2xl p-6 mb-6 text-left space-y-3">
              <p className="text-sm font-semibold mb-2">What happens next?</p>
              {[
                "Complete payment using the button below",
                "Upload your verification documents (now or later from your dashboard)",
                "Our team runs your 6 independent checks",
                "You receive your TVC number and public profile once approved",
              ].map((s, i) => (
                <div key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
                  <div className="w-5 h-5 rounded-full bg-primary/15 text-primary flex items-center justify-center shrink-0 text-xs font-bold mt-0.5">{i + 1}</div>
                  {s}
                </div>
              ))}
            </div>
            {paymentUrl ? (
              <Button
                className="w-full gradient-brand text-white border-0 hover:opacity-90 font-semibold h-11 mb-3"
                onClick={() => window.open(paymentUrl!, "_blank", "noopener")}
              >
                Complete Payment — £20/month
                <ExternalLink className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-sm text-amber-300 mb-3">
                Payment link not yet configured. Contact us and we'll send you the payment link directly.
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
              Upload your verification documents below to speed up the process. You can also skip and upload these later from your member dashboard.
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
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setStep("done")}
            >
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

  if (step === "done") {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <PublicNav />
        <div className="flex-1 flex items-center justify-center px-6 py-24">
          <div className="max-w-md w-full text-center">
            <div className="w-16 h-16 rounded-2xl gradient-brand flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-extrabold mb-4">Documents uploaded!</h1>
            <p className="text-muted-foreground mb-6 leading-relaxed">
              Your documents have been submitted. Once your payment is confirmed, our team will begin your 6 independent checks.
            </p>
            {paymentUrl && (
              <Button
                className="w-full gradient-brand text-white border-0 hover:opacity-90 font-semibold h-11 mb-3"
                onClick={() => window.open(paymentUrl!, "_blank", "noopener")}
              >
                Complete Payment — £20/month
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

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <PublicNav />

      {/* Hero */}
      <section className="pt-28 pb-16 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <Badge variant="outline" className="mb-6 border-primary/30 text-primary bg-primary/5 px-3 py-1 text-xs font-medium">
            <ShieldCheck className="w-3 h-3 mr-1.5" />
            Join TVC Secured
          </Badge>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
            Get independently <span className="gradient-text">verified</span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto leading-relaxed">
            Give customers the confidence to choose you. TVC independently verifies your business so your badge does the talking.
          </p>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-6 pb-24 grid lg:grid-cols-2 gap-12 items-start w-full">

        {/* Left: Pricing + Benefits */}
        <div className="space-y-6">

          {/* TVC Membership card */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">TVC Membership</p>
                <div className="flex items-end gap-1.5">
                  <span className="text-4xl font-extrabold">£20</span>
                  <span className="text-muted-foreground mb-1.5 text-sm">/month</span>
                </div>
              </div>
              <Badge className="bg-primary/10 text-primary border-primary/20">Standard</Badge>
            </div>
            <ul className="space-y-2.5 mb-6">
              {(APP_CONFIG.planFeatures["tvc membership"]?.features ?? []).map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <PaymentButton
              slug="via-membership"
              label="Join TVC — £20/month"
              className="gradient-brand text-white border-0 hover:opacity-90 glow-primary-sm"
            />
          </div>

          {/* Priority Checking add-on */}
          <div className="bg-card border border-primary/40 rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute top-3 right-3">
              <Badge className="gradient-brand text-white border-0 text-xs">Add-on</Badge>
            </div>
            <div className="mb-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Priority Checking</p>
              <div className="flex items-end gap-1.5">
                <span className="text-4xl font-extrabold">£49</span>
                <span className="text-muted-foreground mb-1.5 text-sm">one-off</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">Get verified faster — same day or next working day.</p>
            </div>
            <ul className="space-y-2.5 mb-6">
              {(APP_CONFIG.planFeatures["priority checking"]?.features ?? []).map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <PaymentButton
              slug="priority-checking"
              label="Add Priority Checking — £49"
              className="gradient-brand text-white border-0 hover:opacity-90 glow-primary-sm"
            />
          </div>

          {/* Benefits */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">What you get</p>
            {BENEFITS.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex gap-4 p-4 bg-card border border-border rounded-xl">
                <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold mb-0.5">{title}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Application form */}
        <div className="bg-card border border-border rounded-2xl p-8">
          <h2 className="text-xl font-bold mb-1">Start your application</h2>
          <p className="text-sm text-muted-foreground mb-6">We'll review your details and begin verification once your membership is active.</p>

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

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="location">Town / City <span className="text-destructive">*</span></Label>
                <Input id="location" value={form.location} onChange={update("location")} placeholder="Birmingham" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="website">Website (optional)</Label>
                <Input id="website" type="url" value={form.website} onChange={update("website")} placeholder="https://example.co.uk" />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email address <span className="text-destructive">*</span></Label>
                <Input id="email" type="email" value={form.email} onChange={update("email")} placeholder="jane@example.co.uk" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone number</Label>
                <Input id="phone" type="tel" value={form.phone} onChange={update("phone")} placeholder="07700 900000" />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="password">Create password <span className="text-destructive">*</span></Label>
                <Input id="password" type="password" value={form.password} onChange={update("password")} placeholder="Min. 8 characters" autoComplete="new-password" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm_password">Confirm password <span className="text-destructive">*</span></Label>
                <Input id="confirm_password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repeat password" autoComplete="new-password" required />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="message">Anything else you'd like to tell us?</Label>
              <textarea
                id="message"
                value={form.message}
                onChange={update("message")}
                rows={3}
                placeholder="Accreditations, certifications, years in business…"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>

            <Button type="submit" disabled={submitting} className="w-full gradient-brand text-white border-0 hover:opacity-90 font-semibold h-11">
              {submitting ? "Creating account…" : "Create Account & Submit Application"}
              {!submitting && <ArrowRight className="w-4 h-4 ml-2" />}
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              By submitting you agree to our{" "}
              <Link href="/terms" className="underline hover:text-foreground">Terms</Link>{" "}
              and{" "}
              <Link href="/privacy" className="underline hover:text-foreground">Privacy Policy</Link>.
            </p>
          </form>
        </div>
      </div>

      <PublicFooter />
    </div>
  );
}

function PublicNav() {
  return (
    <header className="fixed top-0 inset-x-0 z-50 border-b border-border/60 bg-background/90 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <TVCLogo size={109} />
          <span className="font-bold text-lg tracking-tight">Approved</span>
        </Link>
        <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
          <Link href="/verify" className="hover:text-foreground transition-colors">Check a TVC Number</Link>
          <Link href="/join" className="hover:text-foreground transition-colors text-foreground font-medium">Join TVC</Link>
          <Link href="/contact" className="hover:text-foreground transition-colors">Contact</Link>
        </nav>
      </div>
    </header>
  );
}

function PublicFooter() {
  return (
    <footer className="border-t border-border py-8 px-6 mt-auto">
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <TVCLogo size={74} />
          <span className="font-semibold text-foreground">Approved</span>
        </div>
        <div className="flex items-center gap-6">
          <Link href="/disclaimer" className="hover:text-foreground transition-colors">Disclaimer</Link>
          <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
          <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
        </div>
        <p>© {new Date().getFullYear()} {APP_CONFIG.legalName}</p>
      </div>
    </footer>
  );
}
