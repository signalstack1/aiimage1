import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Save, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Profile {
  id?: string;
  business_name: string;
  logo_url: string;
  phone: string;
  email: string;
  whatsapp_link: string;
  address: string;
  opening_hours: string;
  service_areas: string;
  facebook_url: string;
  instagram_url: string;
  tiktok_url: string;
  linkedin_url: string;
  cta_label: string;
  cta_link: string;
}

const EMPTY: Profile = {
  business_name: "", logo_url: "", phone: "", email: "", whatsapp_link: "",
  address: "", opening_hours: "", service_areas: "", facebook_url: "",
  instagram_url: "", tiktok_url: "", linkedin_url: "", cta_label: "", cta_link: "",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-border">
        <p className="font-semibold text-sm">{title}</p>
      </div>
      <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>
    </div>
  );
}

export default function AdminBusinessProfilePage() {
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const token = sessionStorage.getItem("admin_token") || "";
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetch("/api/admin/business-profile", { headers })
      .then((r) => r.json())
      .then((d) => setProfile({ ...EMPTY, ...d }))
      .catch(() => setProfile(EMPTY))
      .finally(() => setLoading(false));
  }, []);

  const set = (key: keyof Profile) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setProfile((p) => ({ ...p, [key]: e.target.value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/business-profile", { method: "PATCH", headers, body: JSON.stringify(profile) });
      if (!res.ok) throw new Error();
      toast({ title: "Saved", description: "Business profile updated." });
    } catch {
      toast({ title: "Error", description: "Could not save profile.", variant: "destructive" });
    } finally { setSaving(false); }
  };

  return (
    <AdminLayout>
      <div className="p-8 max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><Building2 className="w-6 h-6" /> Business Profile</h1>
            <p className="text-sm text-muted-foreground mt-1">Core business details used across the site.</p>
          </div>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            <Save className="w-4 h-4" />{saving ? "Saving…" : "Save changes"}
          </Button>
        </div>

        {loading ? (
          <div className="space-y-3">{[1,2,3,4,5,6].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : (
          <>
            <Section title="Identity">
              <Field label="Business name">
                <Input value={profile.business_name} onChange={set("business_name")} placeholder="Acme Ltd" />
              </Field>
              <Field label="Logo URL">
                <Input value={profile.logo_url} onChange={set("logo_url")} placeholder="https://…/logo.png" />
              </Field>
              <Field label="Email">
                <Input value={profile.email} onChange={set("email")} placeholder="hello@business.com" />
              </Field>
              <Field label="Phone">
                <Input value={profile.phone} onChange={set("phone")} placeholder="+44 7700 000000" />
              </Field>
              <Field label="WhatsApp link">
                <Input value={profile.whatsapp_link} onChange={set("whatsapp_link")} placeholder="https://wa.me/447700000000" />
              </Field>
            </Section>

            <Section title="Location & Hours">
              <div className="md:col-span-2">
                <Field label="Address">
                  <Textarea value={profile.address} onChange={set("address")} placeholder="123 Main St, London, EC1A 1BB" rows={2} />
                </Field>
              </div>
              <Field label="Opening hours">
                <Textarea value={profile.opening_hours} onChange={set("opening_hours")} placeholder="Mon–Fri 9am–6pm, Sat 10am–4pm" rows={3} />
              </Field>
              <Field label="Service areas">
                <Textarea value={profile.service_areas} onChange={set("service_areas")} placeholder="London, Surrey, Kent" rows={3} />
              </Field>
            </Section>

            <Section title="Social Media">
              <Field label="Facebook URL">
                <Input value={profile.facebook_url} onChange={set("facebook_url")} placeholder="https://facebook.com/…" />
              </Field>
              <Field label="Instagram URL">
                <Input value={profile.instagram_url} onChange={set("instagram_url")} placeholder="https://instagram.com/…" />
              </Field>
              <Field label="TikTok URL">
                <Input value={profile.tiktok_url} onChange={set("tiktok_url")} placeholder="https://tiktok.com/@…" />
              </Field>
              <Field label="LinkedIn URL">
                <Input value={profile.linkedin_url} onChange={set("linkedin_url")} placeholder="https://linkedin.com/company/…" />
              </Field>
            </Section>

            <Section title="Primary Call to Action">
              <Field label="CTA button label">
                <Input value={profile.cta_label} onChange={set("cta_label")} placeholder="Get a Free Quote" />
              </Field>
              <Field label="CTA link / URL">
                <Input value={profile.cta_link} onChange={set("cta_link")} placeholder="/contact or https://…" />
              </Field>
            </Section>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
