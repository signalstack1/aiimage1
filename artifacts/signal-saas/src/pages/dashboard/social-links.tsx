import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { getPlanEntitlements } from "@/config/app";
import { Share2, Lock, CheckCircle2, AlertTriangle, ExternalLink } from "lucide-react";

const BASE_URL = import.meta.env.VITE_API_URL || "";

const PLATFORMS = [
  { value: "facebook",  label: "Facebook",   placeholder: "https://facebook.com/yourbusiness" },
  { value: "instagram", label: "Instagram",   placeholder: "https://instagram.com/yourhandle" },
  { value: "linkedin",  label: "LinkedIn",    placeholder: "https://linkedin.com/in/yourprofile" },
  { value: "tiktok",   label: "TikTok",      placeholder: "https://tiktok.com/@yourhandle" },
  { value: "youtube",  label: "YouTube",     placeholder: "https://youtube.com/@yourchannel" },
  { value: "x",        label: "X (Twitter)", placeholder: "https://x.com/yourhandle" },
  { value: "other",    label: "Other",       placeholder: "https://example.com/yourbusiness" },
];

interface SocialLink { platform: string; url: string; }

export default function DashboardSocialLinks() {
  const { member, fetchWithAuth } = useAuth();
  const planCode = member?.application?.plan_code ?? null;
  const canAccess = getPlanEntitlements(planCode).social_links;

  const [links, setLinks]   = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);
  const [error, setError]   = useState<string | null>(null);

  useEffect(() => {
    if (!canAccess) return;
    fetchWithAuth(`${BASE_URL}/api/member/social-links`)
      .then(r => r.ok ? r.json() : [])
      .then((data: SocialLink[]) => {
        const map: Record<string, string> = {};
        for (const l of data) map[l.platform] = l.url;
        setLinks(map);
      })
      .catch(() => {});
  }, [canAccess]);

  const handleSave = async () => {
    setError(null);
    setSaved(false);
    const payload: SocialLink[] = [];
    for (const p of PLATFORMS) {
      const url = (links[p.value] || "").trim();
      if (!url) continue;
      if (!url.startsWith("https://")) {
        setError(`${p.label} URL must start with https://`);
        return;
      }
      payload.push({ platform: p.value, url });
    }
    setSaving(true);
    try {
      const r = await fetchWithAuth(`${BASE_URL}/api/member/social-links`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ links: payload }),
      });
      const j = await r.json();
      if (!r.ok) { setError(j.error || "Save failed"); return; }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (!canAccess) {
    return (
      <DashboardLayout>
        <div className="p-8 max-w-2xl">
          <h1 className="text-2xl font-extrabold mb-1">Social Media Links</h1>
          <p className="text-muted-foreground mb-8">Add your social channels to your public TVC profile.</p>
          <div className="bg-card border border-border rounded-2xl p-10 flex flex-col items-center text-center">
            <Lock className="w-10 h-10 text-muted-foreground mb-4" />
            <p className="font-bold mb-1">TVC Plus only</p>
            <p className="text-sm text-muted-foreground max-w-sm">
              Upgrade to TVC Plus to display your social media links on your public profile.
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-8 max-w-2xl">
        <div className="flex items-center gap-3 mb-1">
          <Share2 className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-extrabold">Social Media Links</h1>
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">TVC Plus</span>
        </div>
        <p className="text-muted-foreground mb-8">Add links to your social channels. These appear on your public TVC profile.</p>

        {error && (
          <div className="bg-destructive/10 border border-destructive/30 text-destructive text-sm rounded-lg px-4 py-3 mb-6 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}
        {saved && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm rounded-lg px-4 py-3 mb-6 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" /> Social links saved.
          </div>
        )}

        <div className="bg-card border border-border rounded-2xl p-6 space-y-5 mb-4">
          {PLATFORMS.map(({ value, label, placeholder }) => (
            <div key={value} className="space-y-1.5">
              <Label htmlFor={value}>{label}</Label>
              <div className="relative">
                <Input
                  id={value}
                  type="url"
                  value={links[value] || ""}
                  onChange={(e) => setLinks((prev) => ({ ...prev, [value]: e.target.value }))}
                  placeholder={placeholder}
                  className="pr-9"
                />
                {links[value] && (
                  <a
                    href={links[value]}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs text-muted-foreground mb-4">All URLs must start with https://. Leave a field blank to remove that link from your profile.</p>

        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full gradient-brand text-white border-0 hover:opacity-90 font-semibold h-11"
        >
          {saving ? "Saving…" : "Save social links"}
        </Button>
      </div>
    </DashboardLayout>
  );
}
