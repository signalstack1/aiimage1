import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { CheckCircle2, Lock, AlertTriangle } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { getPlanEntitlements } from "@/config/app";

const BASE_URL = import.meta.env.VITE_API_URL || "";

const TRADE_TYPES = [
  "Electrician", "Plumber", "Gas Engineer", "Builder", "Roofer",
  "Painter & Decorator", "Carpenter / Joiner", "Plasterer",
  "Tiler", "Flooring Specialist", "Landscaper / Gardener",
  "Locksmith", "Heating Engineer", "Solar / Renewable",
  "Kitchen Fitter", "Bathroom Fitter", "Other",
];

interface ProfileForm {
  business_name: string;
  trade_type: string;
  location: string;
  website: string;
  contact_phone: string;
  contact_enabled: boolean;
  description: string;
}

export default function DashboardProfile() {
  const { member, refreshMember, fetchWithAuth } = useAuth();
  const planCode = member?.application?.plan_code ?? null;
  const entitlements = getPlanEntitlements(planCode);
  const canEditDescription = entitlements.enhanced_profile;
  const canEditIntro = entitlements.portfolio_access;

  const [form, setForm] = useState<ProfileForm>({
    business_name: "",
    trade_type: "",
    location: "",
    website: "",
    contact_phone: "",
    contact_enabled: false,
    description: "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);
  const [error, setError]   = useState<string | null>(null);

  const [intro, setIntro]             = useState("");
  const [savingIntro, setSavingIntro] = useState(false);
  const [introSaved, setIntroSaved]   = useState(false);
  const [introError, setIntroError]   = useState<string | null>(null);

  useEffect(() => {
    if (!member?.business) return;
    const b = member.business;
    setForm({
      business_name:   b.business_name ?? "",
      trade_type:      b.trade_type ?? "",
      location:        b.location ?? "",
      website:         b.website ?? "",
      contact_phone:   b.contact_phone ?? "",
      contact_enabled: b.contact_enabled ?? false,
      description:     b.description ?? "",
    });
    setIntro((b as any).business_intro ?? "");
  }, [member]);

  const update = <K extends keyof ProfileForm>(key: K) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setSaved(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = canEditDescription ? form : (({ description: _d, ...rest }) => rest)(form);
      const res = await fetchWithAuth(`${BASE_URL}/api/member/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Save failed");
      }
      await refreshMember();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const saveIntro = async () => {
    setIntroError(null);
    setIntroSaved(false);
    setSavingIntro(true);
    try {
      const res = await fetchWithAuth(`${BASE_URL}/api/member/business-intro`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intro }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Save failed");
      }
      setIntroSaved(true);
      setTimeout(() => setIntroSaved(false), 3000);
    } catch (err: any) {
      setIntroError(err.message);
    } finally {
      setSavingIntro(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-8 max-w-2xl">
        <h1 className="text-2xl font-extrabold mb-1">My Profile</h1>
        <p className="text-muted-foreground mb-8">Update your business details. These appear on your public TVC profile once approved.</p>

        {error && (
          <div className="bg-destructive/10 border border-destructive/30 text-destructive text-sm rounded-lg px-4 py-3 mb-6">
            {error}
          </div>
        )}

        {saved && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm rounded-lg px-4 py-3 mb-6 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Profile saved successfully.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
            <h2 className="font-bold text-sm text-muted-foreground uppercase tracking-wider">Business details</h2>

            <div className="space-y-1.5">
              <Label htmlFor="business_name">Business name *</Label>
              <Input id="business_name" value={form.business_name} onChange={update("business_name")} placeholder="Smith Electrical Ltd" required />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="trade_type">Trade type *</Label>
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
                <Label htmlFor="location">Town / City *</Label>
                <Input id="location" value={form.location} onChange={update("location")} placeholder="Birmingham" required />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="website">Website</Label>
              <Input id="website" type="url" value={form.website} onChange={update("website")} placeholder="https://smithelectrical.co.uk" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description" className="flex items-center gap-2">
                Business description
                {!canEditDescription && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-muted border border-border text-muted-foreground">
                    <Lock className="w-2.5 h-2.5" /> TVC Plus
                  </span>
                )}
              </Label>
              {canEditDescription ? (
                <textarea
                  id="description"
                  value={form.description}
                  onChange={update("description")}
                  rows={3}
                  placeholder="A brief description of your business, years of experience, areas covered…"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
              ) : (
                <div className="w-full rounded-md border border-input bg-muted/40 px-3 py-3 text-sm text-muted-foreground flex items-start gap-2 min-h-[72px]">
                  <Lock className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span>Business description is available on TVC Plus. Upgrade your plan to add a business bio.</span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
            <h2 className="font-bold text-sm text-muted-foreground uppercase tracking-wider">Contact settings</h2>

            <div className="space-y-1.5">
              <Label htmlFor="contact_phone">Phone number</Label>
              <Input id="contact_phone" type="tel" value={form.contact_phone} onChange={update("contact_phone")} placeholder="07700 900000" />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Show phone on public profile</p>
                <p className="text-xs text-muted-foreground mt-0.5">Customers can see your number on your TVC profile page.</p>
              </div>
              <Switch
                checked={form.contact_enabled}
                onCheckedChange={(v) => { setForm((f) => ({ ...f, contact_enabled: v })); setSaved(false); }}
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={saving}
            className="w-full gradient-brand text-white border-0 hover:opacity-90 font-semibold h-11"
          >
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </form>

        {canEditIntro && (
          <div className="mt-6 bg-card border border-border rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="font-bold">Business Introduction</h2>
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">TVC Plus</span>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              A detailed introduction about your experience, specialisms, and service area. Shown on your public TVC profile below the short description. Maximum 1,500 characters.
            </p>
            {introError && (
              <div className="bg-destructive/10 border border-destructive/30 text-destructive text-sm rounded-lg px-4 py-3 mb-4 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" /> {introError}
              </div>
            )}
            {introSaved && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm rounded-lg px-4 py-3 mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" /> Introduction saved.
              </div>
            )}
            <textarea
              value={intro}
              onChange={(e) => { setIntro(e.target.value); setIntroSaved(false); }}
              maxLength={1500}
              rows={7}
              placeholder="Tell customers about your experience, qualifications, certifications, and what makes your service stand out…"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring resize-none mb-2"
            />
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs text-muted-foreground">{intro.length} / 1,500</span>
            </div>
            <Button
              type="button"
              onClick={saveIntro}
              disabled={savingIntro}
              className="gradient-brand text-white border-0 hover:opacity-90 font-semibold h-10"
            >
              {savingIntro ? "Saving…" : "Save introduction"}
            </Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
