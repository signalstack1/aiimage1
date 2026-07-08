import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp, CheckCircle2, Star, Zap,
  Shield, Clock, ChevronDown, ChevronUp,
} from "lucide-react";
import { SiDiscord, SiTelegram } from "react-icons/si";
import { APP_CONFIG } from "@/config/app";

async function trackEvent(eventType: string, planId?: string, planName?: string) {
  try {
    await fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event_type: eventType, plan_id: planId ?? null, plan_name: planName ?? null }),
      keepalive: true,
    });
  } catch {
    // tracking failures must never break the UX
  }
}

const FALLBACK_PLANS = [
  { id: "plan-starter", name: "Starter", price: 29, interval: "month", description: "Get your edge in the market" },
  { id: "plan-pro", name: "Pro", price: 79, interval: "month", description: "For serious, full-time traders" },
  { id: "plan-lifetime", name: "Lifetime VIP", price: 499, interval: "once", description: "Pay once, profit forever" },
];

interface ApiPlan {
  id: string;
  name: string;
  description?: string;
  price_cents: number;
  currency?: string;
  interval: string;
  image_url?: string | null;
  payment_url?: string | null;
  payment_provider?: string | null;
  button_label?: string | null;
  stock_quantity?: number;
  show_stock?: boolean;
  product_variants?: { id: string }[];
}

function currencySymbol(currency?: string) {
  return currency === "gbp" ? "£" : "$";
}

function formatInterval(interval: string): string | null {
  if (interval === "one-time") return null;
  if (interval === "weekly")    return "week";
  if (interval === "monthly")   return "month";
  if (interval === "yearly")    return "year";
  if (interval === "quarterly") return "quarter";
  if (interval === "lifetime")  return null;
  return interval;
}

function getIntervalLabel(interval: string): string | null {
  if (interval === "one-time")  return "One-time payment";
  if (interval === "weekly")    return "Billed weekly";
  if (interval === "monthly")   return "Billed monthly";
  if (interval === "quarterly") return "Billed quarterly";
  if (interval === "yearly")    return "Billed yearly";
  if (interval === "lifetime")  return "Lifetime access";
  return null;
}

function defaultButtonLabel(interval: string): string {
  return interval === "one-time" || interval === "lifetime" ? "Buy Now" : "Subscribe";
}

function getPlanMeta(name: string): { features: string[]; highlight: boolean } {
  const key = name.toLowerCase();
  return APP_CONFIG.planFeatures[key] ?? { features: [], highlight: false };
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

function PlanCard({ apiPlan, features, highlight }: {
  apiPlan: ApiPlan;
  features: string[];
  highlight: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [, navigate] = useLocation();

  const name = apiPlan.name;
  const price = (apiPlan.price_cents / 100).toFixed(0);
  const period = formatInterval(apiPlan.interval);
  const intervalLabel = getIntervalLabel(apiPlan.interval);
  const description = apiPlan.description || "";
  const buttonLabel = apiPlan.button_label || defaultButtonLabel(apiPlan.interval);
  const symbol = currencySymbol(apiPlan.currency);
  const paymentUrl = apiPlan.payment_url;
  const hasVariants = (apiPlan.product_variants?.length ?? 0) > 0;
  const stockQty = apiPlan.stock_quantity ?? -1;
  const isOutOfStock = stockQty === 0;
  const showLimitedStock = apiPlan.show_stock && stockQty > 0;

  const handleClick = async () => {
    trackEvent("purchase_click", apiPlan.id, apiPlan.name);
    if (hasVariants) {
      navigate(`/products/${apiPlan.id}`);
      return;
    }
    if (paymentUrl) {
      setLoading(true);
      window.location.href = paymentUrl;
    }
  };

  return (
    <div className={`relative flex flex-col rounded-2xl border overflow-hidden transition-all ${highlight ? "border-primary/60 bg-primary/5 glow-primary-sm" : "border-border bg-card"}`}>
      {highlight && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10">
          <Badge className="gradient-brand text-white border-0 px-3 py-1 text-xs font-semibold shadow-lg">
            Most Popular
          </Badge>
        </div>
      )}
      {apiPlan.image_url && (
        <div className="w-full aspect-video overflow-hidden">
          <img src={apiPlan.image_url} alt={name} className="w-full h-full object-cover" />
        </div>
      )}
      <div className="p-7 flex flex-col flex-1">
        <div className="mb-5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{name}</p>
          <div className="flex items-end gap-1.5 mb-2">
            <span className="text-4xl font-extrabold">{symbol}{price}</span>
            {period && <span className="text-muted-foreground mb-1.5 text-sm">/{period}</span>}
          </div>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <ul className="space-y-2.5 flex-1 mb-7">
          {features.map((f) => (
            <li key={f} className="flex items-start gap-2.5 text-sm">
              <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <span>{f}</span>
            </li>
          ))}
        </ul>
        {showLimitedStock && (
          <p className="text-center text-xs text-amber-400 font-medium mb-2">Only {stockQty} left</p>
        )}
        <Button
          className={`w-full font-semibold ${highlight ? "gradient-brand text-white border-0 hover:opacity-90 glow-primary-sm" : "border-border hover:bg-accent"}`}
          variant={highlight ? "default" : "outline"}
          onClick={handleClick}
          disabled={loading || isOutOfStock || (!hasVariants && !paymentUrl)}
        >
          {loading ? "Redirecting…" : isOutOfStock ? "Out of stock" : !paymentUrl && !hasVariants ? "Coming soon" : hasVariants ? "View options" : buttonLabel}
        </Button>
        {intervalLabel && (
          <p className="text-center text-xs text-muted-foreground mt-2.5">{intervalLabel}</p>
        )}
      </div>
    </div>
  );
}

export default function HomePage() {
  const [apiPlans, setApiPlans] = useState<ApiPlan[]>([]);
  const viewsFiredRef = useRef(false);

  useEffect(() => {
    fetch("/api/plans").then((r) => r.json()).then((data) => {
      if (Array.isArray(data) && data.length > 0) setApiPlans(data);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const el = document.getElementById("pricing");
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !viewsFiredRef.current) {
          viewsFiredRef.current = true;
          (apiPlans.length > 0 ? apiPlans : []).forEach((plan) => {
            trackEvent("product_view", plan.id, plan.name);
          });
          observer.disconnect();
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [apiPlans]);

  const displayPlans: ApiPlan[] = apiPlans.length > 0 ? apiPlans : FALLBACK_PLANS.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    price_cents: p.price * 100,
    interval: p.interval === "month" ? "monthly" : p.interval === "once" ? "lifetime" : p.interval,
    payment_url: null,
    payment_provider: null,
    button_label: null,
  }));

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navbar */}
      <header className="fixed top-0 inset-x-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg gradient-brand flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight">{APP_CONFIG.appName}</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#results" className="hover:text-foreground transition-colors">Results</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-foreground transition-colors">FAQ</a>
            <a href="/shop" className="hover:text-foreground transition-colors">Shop</a>
          </nav>
          <Button size="sm" className="gradient-brand text-white border-0 hover:opacity-90 font-semibold" asChild>
            <a href="#pricing">Join Now</a>
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-32 pb-24 px-6 relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-20 left-1/4 w-96 h-96 bg-primary/8 rounded-full blur-3xl" />
          <div className="absolute top-40 right-1/4 w-72 h-72 bg-blue-500/6 rounded-full blur-3xl" />
        </div>
        <div className="max-w-4xl mx-auto text-center">
          <Badge variant="outline" className="mb-6 border-primary/30 text-primary bg-primary/5 px-3 py-1 text-xs font-medium">
            <Zap className="w-3 h-3 mr-1.5 fill-primary" />
            {APP_CONFIG.hero.badge}
          </Badge>
          <h1 className="text-5xl md:text-7xl font-extrabold leading-[1.05] tracking-tight mb-6">
            {APP_CONFIG.hero.headlinePlain}{" "}
            <span className="gradient-text">{APP_CONFIG.hero.headlineGradient}</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            {APP_CONFIG.hero.subtext}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" className="gradient-brand text-white border-0 hover:opacity-90 text-base font-semibold px-8 h-12 glow-primary" asChild>
              <a href="#pricing">{APP_CONFIG.hero.ctaPrimary}</a>
            </Button>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <SiDiscord className="w-4 h-4 text-indigo-400" />
                <span>Discord</span>
              </div>
              <span>+</span>
              <div className="flex items-center gap-1.5">
                <SiTelegram className="w-4 h-4 text-sky-400" />
                <span>Telegram</span>
              </div>
              <span>included</span>
            </div>
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

      {/* Sample items */}
      <section id="results" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-extrabold mb-4">{APP_CONFIG.sampleSectionTitle}</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">{APP_CONFIG.sampleSectionSubtext}</p>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {APP_CONFIG.sampleItems.map((s) => (
              <div key={s.asset} className="bg-card border border-border rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-bold text-lg">{s.asset}</p>
                    <Badge variant="outline" className="text-xs mt-0.5">{s.market}</Badge>
                  </div>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-md ${s.dir === "LONG" ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"}`}>
                    {s.dir}
                  </span>
                </div>
                <div className="space-y-1.5 text-sm mb-4">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Entry</span>
                    <span className="font-medium font-mono">{s.entry}</span>
                  </div>
                  {s.tp.map((t, i) => (
                    <div key={i} className="flex justify-between">
                      <span className="text-muted-foreground">TP{i + 1}</span>
                      <span className="text-emerald-400 font-mono">{t}</span>
                    </div>
                  ))}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Stop Loss</span>
                    <span className="text-red-400 font-mono">{s.sl}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-border">
                  <span className="text-xs text-muted-foreground">Result</span>
                  <span className="text-emerald-400 font-bold text-sm">{s.result} ✓</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 px-6 bg-card/30 border-y border-border">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-extrabold mb-4">How it works</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">From sign-up to your first signal in under 5 minutes.</p>
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

      {/* Platforms */}
      <section className="py-16 px-6 bg-card/30 border-y border-border">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-widest mb-8 font-medium">Signals delivered to</p>
          <div className="flex items-center justify-center gap-16">
            <div className="flex flex-col items-center gap-3">
              <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                <SiDiscord className="w-8 h-8 text-indigo-400" />
              </div>
              <div>
                <p className="font-semibold text-sm">Discord</p>
                <p className="text-xs text-muted-foreground">Private channel</p>
              </div>
            </div>
            <div className="text-3xl text-muted-foreground/30 font-thin">+</div>
            <div className="flex flex-col items-center gap-3">
              <div className="w-16 h-16 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
                <SiTelegram className="w-8 h-8 text-sky-400" />
              </div>
              <div>
                <p className="font-semibold text-sm">Telegram</p>
                <p className="text-xs text-muted-foreground">Instant push alerts</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-extrabold mb-4">{APP_CONFIG.pricingTitle}</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">{APP_CONFIG.pricingSubtext}</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 items-start">
            {displayPlans.map((plan) => {
              const meta = getPlanMeta(plan.name);
              return (
                <PlanCard
                  key={plan.id}
                  apiPlan={plan}
                  features={meta.features}
                  highlight={meta.highlight}
                />
              );
            })}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-6 mt-10 text-sm text-muted-foreground">
            <div className="flex items-center gap-2"><Shield className="w-4 h-4 text-primary" /> Secure checkout</div>
            <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-primary" /> Instant access after payment</div>
            <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> Cancel anytime</div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-24 px-6 bg-card/30 border-t border-border">
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
          <h2 className="text-4xl font-extrabold mb-4">{APP_CONFIG.finalCta.headline}</h2>
          <p className="text-muted-foreground mb-8 text-lg">{APP_CONFIG.finalCta.subtext}</p>
          <Button size="lg" className="gradient-brand text-white border-0 hover:opacity-90 text-base font-semibold px-10 h-12 glow-primary" asChild>
            <a href="#pricing">{APP_CONFIG.finalCta.buttonText}</a>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-10 px-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded gradient-brand flex items-center justify-center">
              <TrendingUp className="w-3 h-3 text-white" />
            </div>
            <span className="font-semibold text-foreground">{APP_CONFIG.appName}</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/disclaimer" className="hover:text-foreground transition-colors">Disclaimer</Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
            <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
          </div>
          <p>© {new Date().getFullYear()} {APP_CONFIG.legalName}. All rights reserved. Past performance is not indicative of future results.</p>
        </div>
      </footer>
    </div>
  );
}
