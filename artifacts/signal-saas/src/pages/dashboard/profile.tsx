import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { CheckCircle2 } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";

const BASE_URL = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

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
  const [form, setForm] = useState<ProfileForm>({
    business_name: "",
    trade_type: "",
    location: "",
    website: "",
    contact_phone: "",
    contact_enabled: false,
    description: "",
  });
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [error, setError]     = useState<string | null>(null);

  // Populate form from member data
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
      const res = await fetchWithAuth(`${BASE_URL}/api/member/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
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
              <Label htmlFor="description">Business description</Label>
              <textarea
                id="description"
                value={form.description}
                onChange={update("description")}
                rows={3}
                placeholder="A brief description of your business, years of experience, areas covered…"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
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
      </div>
    </DashboardLayout>
  );
}
