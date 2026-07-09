import { useState, useEffect } from "react";
import { Link, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  ShieldCheck, Search, CheckCircle2, XCircle, Clock,
  MapPin, Building2, Award, Globe, FileSearch, Phone,
  ArrowLeft, AlertTriangle,
} from "lucide-react";
import { APP_CONFIG } from "@/config/app";

const BASE_URL = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

interface VerificationCheck {
  check_type: string;
  status: "verified" | "unverified" | "pending";
  checked_at: string | null;
}

interface PublicProfile {
  via_number: string;
  business_name: string;
  trade_type: string;
  location: string;
  status: "approved" | "pending" | "rejected" | "expired";
  last_checked: string | null;
  contact_phone: string | null;
  contact_enabled: boolean;
  checks: VerificationCheck[];
}

const CHECK_LABELS: Record<string, { label: string; icon: React.ElementType }> = {
  local_address:   { label: "Local Address",              icon: MapPin },
  business_type:   { label: "Business Type",              icon: Building2 },
  insurance:       { label: "Public Liability Insurance", icon: ShieldCheck },
  accreditations:  { label: "Trade Accreditations",       icon: Award },
  digital_footprint: { label: "Digital Footprint",        icon: Globe },
  public_records:  { label: "Contact & Public Records",   icon: FileSearch },
};

async function fetchProfile(viaNumber: string): Promise<PublicProfile | null> {
  try {
    const res = await fetch(`${BASE_URL}/api/via/verify/${encodeURIComponent(viaNumber)}`);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error("Fetch failed");
    return await res.json();
  } catch {
    return null;
  }
}

function StatusBadge({ status }: { status: PublicProfile["status"] }) {
  const map = {
    approved: { label: "TVC Verified", class: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
    pending:  { label: "Pending Review", class: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
    rejected: { label: "Not Verified", class: "bg-red-500/15 text-red-400 border-red-500/30" },
    expired:  { label: "Expired", class: "bg-muted text-muted-foreground border-border" },
  };
  const s = map[status] ?? map.pending;
  return <Badge className={`border ${s.class} text-xs font-semibold px-3 py-1`}>{s.label}</Badge>;
}

function CheckRow({ checkType, status }: { checkType: string; status: VerificationCheck["status"] }) {
  const meta = CHECK_LABELS[checkType];
  if (!meta) return null;
  const Icon = meta.icon;
  return (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-card border border-border flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-muted-foreground" />
        </div>
        <span className="text-sm font-medium">{meta.label}</span>
      </div>
      <div className="flex items-center gap-1.5">
        {status === "verified" && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
        {status === "unverified" && <XCircle className="w-4 h-4 text-red-400" />}
        {status === "pending" && <Clock className="w-4 h-4 text-amber-400" />}
        <span className={`text-xs font-semibold ${status === "verified" ? "text-emerald-400" : status === "unverified" ? "text-red-400" : "text-amber-400"}`}>
          {status === "verified" ? "Verified" : status === "unverified" ? "Not verified" : "Pending"}
        </span>
      </div>
    </div>
  );
}

function ProfileView({ profile }: { profile: PublicProfile }) {
  const allChecks = Object.keys(CHECK_LABELS);
  const checkMap: Record<string, VerificationCheck["status"]> = {};
  for (const c of profile.checks) checkMap[c.check_type] = c.status;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Status header */}
      <div className={`rounded-2xl border p-6 mb-6 ${profile.status === "approved" ? "border-emerald-500/30 bg-emerald-500/5" : "border-border bg-card"}`}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${profile.status === "approved" ? "gradient-brand" : "bg-muted"}`}>
              <ShieldCheck className="w-7 h-7 text-white" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium mb-1">TVC Number</p>
              <p className="text-2xl font-extrabold tracking-tight">{profile.via_number}</p>
            </div>
          </div>
          <StatusBadge status={profile.status} />
        </div>
      </div>

      {/* Business info */}
      <div className="bg-card border border-border rounded-2xl p-6 mb-4">
        <h2 className="font-bold text-lg mb-4">{profile.business_name}</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="flex items-center gap-2.5 text-sm">
            <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Trade Type</p>
              <p className="font-medium">{profile.trade_type}</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 text-sm">
            <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Location</p>
              <p className="font-medium">{profile.location}</p>
            </div>
          </div>
          {profile.last_checked && (
            <div className="flex items-center gap-2.5 text-sm">
              <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Last checked</p>
                <p className="font-medium">{new Date(profile.last_checked).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</p>
              </div>
            </div>
          )}
          {profile.contact_enabled && profile.contact_phone && (
            <div className="flex items-center gap-2.5 text-sm">
              <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Contact</p>
                <a href={`tel:${profile.contact_phone}`} className="font-medium text-primary hover:underline">{profile.contact_phone}</a>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Verification checks */}
      <div className="bg-card border border-border rounded-2xl p-6 mb-6">
        <h3 className="font-bold mb-1">Verification checks</h3>
        <p className="text-xs text-muted-foreground mb-4">Each item is independently verified by TVC before being marked as confirmed.</p>
        <div>
          {allChecks.map((checkType) => (
            <CheckRow
              key={checkType}
              checkType={checkType}
              status={checkMap[checkType] ?? "pending"}
            />
          ))}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Button variant="outline" className="flex-1" asChild>
          <Link href="/verify">
            <Search className="w-4 h-4 mr-2" />
            Search another TVC number
          </Link>
        </Button>
        <Button className="flex-1 gradient-brand text-white border-0 hover:opacity-90" asChild>
          <Link href="/join">Join TVC yourself</Link>
        </Button>
      </div>
    </div>
  );
}

function SearchPage({ initialQuery = "" }: { initialQuery?: string }) {
  const [query, setQuery] = useState(initialQuery);
  const [, navigate] = (useParams as any)?.() ? [null, (v: string) => { window.location.href = `/verify/${v}`; }] : [null, (v: string) => { window.location.href = v; }];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = query.trim().toUpperCase().replace(/\s/g, "");
    if (clean) window.location.href = `${BASE_URL}/verify/${clean}`;
  };

  return (
    <div className="max-w-xl mx-auto text-center">
      <div className="w-16 h-16 rounded-2xl gradient-brand flex items-center justify-center mx-auto mb-6">
        <ShieldCheck className="w-8 h-8 text-white" />
      </div>
      <h1 className="text-4xl font-extrabold mb-3">Check a TVC number</h1>
      <p className="text-muted-foreground mb-8 leading-relaxed">
        Enter the TVC number shown on a tradesperson's badge, van, or website to verify their status instantly.
      </p>
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. TVC1042"
            className="pl-9 h-12 text-base bg-card border-border"
            autoFocus
          />
        </div>
        <Button type="submit" size="lg" className="gradient-brand text-white border-0 hover:opacity-90 font-semibold h-12 px-6">
          Check
        </Button>
      </form>
      <p className="text-xs text-muted-foreground mt-4">Free to search · No account needed</p>

      <div className="mt-12 bg-card border border-border rounded-2xl p-6 text-left">
        <p className="text-sm font-semibold mb-3">How TVC numbers work</p>
        <div className="space-y-3">
          {[
            "TVC numbers are issued to tradespeople once their independent verification is approved.",
            "Each number is unique and tied to a single business — they cannot be shared or transferred.",
            "If a TVC number search returns no results, the tradesperson has not been verified by TVC Secured.",
          ].map((s, i) => (
            <div key={i} className="flex gap-3 text-sm text-muted-foreground">
              <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              {s}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Route: /verify ─────────────────────────────────────────────────────────────
export function VerifySearchPage() {
  return (
    <PageShell>
      <SearchPage />
    </PageShell>
  );
}

// ── Route: /verify/:viaNumber ──────────────────────────────────────────────────
export function VerifyProfilePage({ viaNumber }: { viaNumber: string }) {
  const [profile, setProfile] = useState<PublicProfile | null | "loading" | "not_found">("loading");

  useEffect(() => {
    setProfile("loading");
    fetchProfile(viaNumber).then((data) => {
      setProfile(data ?? "not_found");
    });
  }, [viaNumber]);

  return (
    <PageShell>
      <div className="max-w-2xl mx-auto w-full">
        <Button variant="ghost" size="sm" className="mb-6 text-muted-foreground" asChild>
          <Link href="/verify">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to search
          </Link>
        </Button>

        {profile === "loading" && (
          <div className="text-center py-20">
            <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground text-sm">Checking TVC number…</p>
          </div>
        )}

        {profile === "not_found" && (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-8 h-8 text-muted-foreground" />
            </div>
            <h2 className="text-2xl font-bold mb-3">No verified member found</h2>
            <p className="text-muted-foreground mb-2 max-w-sm mx-auto leading-relaxed">
              The TVC number <span className="font-mono font-semibold text-foreground">{viaNumber}</span> does not match any verified member in our database.
            </p>
            <p className="text-sm text-muted-foreground mb-8">This could mean the number is invalid, the membership has lapsed, or the tradesperson has not been verified by TVC Secured.</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button variant="outline" asChild>
                <Link href="/verify">Try another number</Link>
              </Button>
              <Button className="gradient-brand text-white border-0 hover:opacity-90" asChild>
                <Link href="/join">Join TVC yourself</Link>
              </Button>
            </div>
          </div>
        )}

        {profile && profile !== "loading" && profile !== "not_found" && (
          <ProfileView profile={profile} />
        )}
      </div>
    </PageShell>
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="fixed top-0 inset-x-0 z-50 border-b border-border/60 bg-background/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <TVCLogo size={32} />
            <span className="font-bold text-lg tracking-tight">Approved</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <Link href="/verify" className="hover:text-foreground transition-colors text-foreground font-medium">Check a TVC Number</Link>
            <Link href="/join" className="hover:text-foreground transition-colors">Join TVC</Link>
            <Link href="/contact" className="hover:text-foreground transition-colors">Contact</Link>
          </nav>
        </div>
      </header>
      <main className="flex-1 pt-28 pb-20 px-6">
        {children}
      </main>
      <footer className="border-t border-border py-8 px-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">Approved</span>
          <div className="flex items-center gap-6">
            <Link href="/disclaimer" className="hover:text-foreground">Disclaimer</Link>
            <Link href="/terms" className="hover:text-foreground">Terms</Link>
            <Link href="/privacy" className="hover:text-foreground">Privacy</Link>
          </div>
          <p>© {new Date().getFullYear()} {APP_CONFIG.legalName}</p>
        </div>
      </footer>
    </div>
  );
}
