import { useState } from "react";
import { Link, useLocation } from "wouter";
import { TVCLogo } from "@/components/TVCLogo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  ShieldCheck, MapPin, Building2, Award, Globe, FileSearch,
  CheckCircle2, Star, Search, ChevronDown, ChevronUp, ArrowRight,
} from "lucide-react";
import { APP_CONFIG } from "@/config/app";

const ICON_MAP: Record<string, React.ElementType> = {
  MapPin, Building2, ShieldCheck, Award, Globe, FileSearch,
};

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-5 py-4 text-left font-medium text-sm hover:bg-accent/30 transition-colors"
        onClick={() => setOpen(!open)}
      >
        {q}
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
      </button>
      {open && (
        <div className="px-5 pb-4 text-sm text-muted-foreground leading-relaxed border-t border-border pt-4">
          {a}
        </div>
      )}
    </div>
  );
}

function StarRating({ n }: { n: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: n }).map((_, i) => (
        <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
      ))}
    </div>
  );
}

function TVCSearchBar() {
  const [value, setValue] = useState("");
  const [, navigate] = useLocation();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = value.trim().toUpperCase().replace(/\s/g, "");
    if (clean) navigate(`/verify/${clean}`);
  };

  return (
    <form onSubmit={handleSearch} className="flex gap-2 max-w-md mx-auto">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Enter TVC number e.g. TVC1042"
          className="pl-9 h-12 text-base bg-card border-border"
        />
      </div>
      <Button type="submit" size="lg" className="gradient-brand text-white border-0 hover:opacity-90 font-semibold h-12 px-6 glow-primary-sm">
        Check
      </Button>
    </form>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navbar */}
      <header className="fixed top-0 inset-x-0 z-50 border-b border-border/60 bg-background/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 py-2 flex items-center justify-between">
          <div className="flex flex-col items-center">
            <TVCLogo size={131} />
            <span className="text-xs font-semibold tracking-wide whitespace-nowrap mt-1">
              Trades <span style={{ color: "hsl(142, 71%, 45%)" }}>|</span> Verified <span style={{ color: "hsl(142, 71%, 45%)" }}>|</span> Checked
            </span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <Link href="/verify" className="hover:text-foreground transition-colors">Check a TVC Number</Link>
            <Link href="/join" className="hover:text-foreground transition-colors">Join TVC</Link>
            <Link href="/contact" className="hover:text-foreground transition-colors">Contact</Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors font-medium">Login</Link>
            <Button size="sm" className="gradient-brand text-white border-0 hover:opacity-90 font-semibold" asChild>
              <Link href="/join">Apply Now</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6 relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-20 left-1/4 w-96 h-96 bg-primary/6 rounded-full blur-3xl" />
          <div className="absolute top-40 right-1/4 w-72 h-72 bg-primary/4 rounded-full blur-3xl" />
        </div>
        <div className="max-w-4xl mx-auto text-center">
          <Badge variant="outline" className="mb-6 border-primary/30 text-primary bg-primary/5 px-3 py-1 text-xs font-medium">
            <ShieldCheck className="w-3 h-3 mr-1.5" />
            {APP_CONFIG.hero.badge}
          </Badge>
          <h1 className="text-5xl md:text-7xl font-extrabold leading-[1.05] tracking-tight mb-6">
            {APP_CONFIG.hero.headlinePlain}{" "}
            <span className="gradient-text">{APP_CONFIG.hero.headlineGradient}</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            {APP_CONFIG.hero.subtext}
          </p>

          {/* TVC Number Search */}
          <div className="mb-8">
            <TVCSearchBar />
            <p className="text-xs text-muted-foreground mt-3">Free to search · No account needed</p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" className="gradient-brand text-white border-0 hover:opacity-90 text-base font-semibold px-8 h-12 glow-primary" asChild>
              <Link href="/join">Join TVC — from £15/month</Link>
            </Button>
            <Button size="lg" variant="outline" className="h-12 px-8 text-base" asChild>
              <Link href="/verify">
                <Search className="w-4 h-4 mr-2" />
                Check a TVC Number
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-y border-border bg-card/50 py-8 px-6">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          {APP_CONFIG.stats.map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-2xl md:text-3xl font-extrabold gradient-text">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-extrabold mb-4">How it works</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">Three steps to know if a tradesperson is independently verified.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-10">
            {APP_CONFIG.howItWorks.map(({ step, title, desc }) => (
              <div key={step} className="flex flex-col items-center text-center">
                <div className="w-14 h-14 rounded-2xl border border-primary/30 bg-primary/10 flex items-center justify-center mb-5 text-primary font-black text-xl">
                  {step}
                </div>
                <h3 className="font-bold mb-2">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What we check */}
      <section className="py-24 px-6 bg-card/30 border-y border-border">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-extrabold mb-4">What we check</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Every TVC verification covers six independent checks — all confirmed before a TVC number is issued.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {APP_CONFIG.whatWeCheck.map((item) => {
              const Icon = ICON_MAP[item.icon] || ShieldCheck;
              return (
                <div key={item.title} className="bg-card border border-border rounded-2xl p-6">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-bold mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-extrabold mb-4">{APP_CONFIG.testimonialsSectionTitle}</h2>
            <p className="text-muted-foreground">{APP_CONFIG.testimonialsSectionSubtext}</p>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {APP_CONFIG.testimonials.map((t) => (
              <div key={t.handle} className="bg-card border border-border rounded-2xl p-5">
                <StarRating n={t.stars} />
                <p className="text-sm text-muted-foreground mt-3 mb-4 leading-relaxed">"{t.text}"</p>
                <div>
                  <p className="text-sm font-semibold">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.handle}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24 px-6 bg-card/30 border-t border-border">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-extrabold mb-4">Frequently asked questions</h2>
          </div>
          <div className="space-y-3">
            {APP_CONFIG.faqs.map((f) => <FaqItem key={f.q} q={f.q} a={f.a} />)}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 px-6 relative overflow-hidden border-t border-border">
        <div className="absolute inset-0 -z-10 bg-primary/4" />
        <div className="max-w-2xl mx-auto text-center">
          <ShieldCheck className="w-12 h-12 text-primary mx-auto mb-6" />
          <h2 className="text-4xl font-extrabold mb-4">{APP_CONFIG.finalCta.headline}</h2>
          <p className="text-muted-foreground mb-8 text-lg">{APP_CONFIG.finalCta.subtext}</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" className="gradient-brand text-white border-0 hover:opacity-90 text-base font-semibold px-10 h-12 glow-primary" asChild>
              <Link href="/join">
                {APP_CONFIG.finalCta.buttonText}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="h-12 px-8 text-base" asChild>
              <Link href="/verify">Check a TVC Number</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-10 px-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <TVCLogo size={74} />
            <span className="font-semibold text-foreground">Approved</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/verify" className="hover:text-foreground transition-colors">Verify</Link>
            <Link href="/join" className="hover:text-foreground transition-colors">Join</Link>
            <Link href="/contact" className="hover:text-foreground transition-colors">Contact</Link>
            <Link href="/disclaimer" className="hover:text-foreground transition-colors">Disclaimer</Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
            <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
          </div>
          <p>© {new Date().getFullYear()} {APP_CONFIG.legalName}. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
