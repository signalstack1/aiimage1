import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, ExternalLink } from "lucide-react";
import { SiDiscord, SiTelegram } from "react-icons/si";
import { useToast } from "@/hooks/use-toast";
import { APP_CONFIG } from "@/config/app";

interface AccessLink {
  id: string;
  platform: string;
  label: string;
  invite_url: string;
}

interface LinkForm {
  platform: string;
  label: string;
  invite_url: string;
}

function PlatformBadge({ platform }: { platform: string }) {
  if (platform === "discord")
    return <Badge variant="outline" className="gap-1.5 text-indigo-400 border-indigo-500/20"><SiDiscord className="w-3 h-3" /> Discord</Badge>;
  return <Badge variant="outline" className="gap-1.5 text-sky-400 border-sky-500/20"><SiTelegram className="w-3 h-3" /> Telegram</Badge>;
}

export default function AdminAccessPage() {
  const { toast } = useToast();
  const [links, setLinks] = useState<AccessLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<LinkForm>({ platform: "discord", label: "", invite_url: "" });
  const token = sessionStorage.getItem("admin_token") || "";
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  // Configurable labels — access.singular for button/toast, access.plural for section heading
  const { singular: entitySingular, plural: entityPlural } = APP_CONFIG.admin.access;
  const customerPlural = APP_CONFIG.admin.customers.plural;

  const load = () =>
    fetch("/api/admin/links", { headers })
      .then((r) => r.json())
      .then(setLinks)
      .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/links", { method: "POST", headers, body: JSON.stringify(form) });
      if (!res.ok) throw new Error();
      await load();
      setDialogOpen(false);
      toast({ title: `${entitySingular} added` });
    } catch {
      toast({ title: "Error", description: "Could not save link.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(`Delete this ${entitySingular.toLowerCase()}?`)) return;
    try {
      await fetch(`/api/admin/links/${id}`, { method: "DELETE", headers });
      await load();
      toast({ title: `${entitySingular} deleted` });
    } catch {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  return (
    <AdminLayout>
      <div className="p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">{entityPlural}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Discord and Telegram invite links delivered to {customerPlural.toLowerCase()} after payment.
            </p>
          </div>
          <Button
            onClick={() => { setForm({ platform: "discord", label: "", invite_url: "" }); setDialogOpen(true); }}
            className="gradient-brand text-white border-0 hover:opacity-90 gap-2"
          >
            <Plus className="w-4 h-4" /> Add {entitySingular.toLowerCase()}
          </Button>
        </div>

        {loading ? (
          <div className="space-y-3">{[1, 2].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
        ) : !links.length ? (
          <div className="text-center py-16 border border-dashed border-border rounded-xl">
            <p className="text-muted-foreground text-sm mb-2">No {entityPlural.toLowerCase()} yet.</p>
            <p className="text-xs text-muted-foreground">
              Add Discord and Telegram invite links here. {customerPlural} will see them after payment.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {links.map((link) => (
              <div key={link.id} className="flex items-center justify-between px-5 py-4 rounded-xl border border-border bg-card hover:border-border/80 transition-colors">
                <div className="flex items-center gap-4">
                  <PlatformBadge platform={link.platform} />
                  <div>
                    <p className="font-medium text-sm">{link.label}</p>
                    <p className="text-xs text-muted-foreground font-mono truncate max-w-sm">{link.invite_url}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <a href={link.invite_url} target="_blank" rel="noopener noreferrer">
                    <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Button>
                  </a>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(link.id)} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle>Add {entitySingular.toLowerCase()}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Platform</Label>
              <Select value={form.platform} onValueChange={(v) => setForm({ ...form, platform: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="discord">Discord</SelectItem>
                  <SelectItem value="telegram">Telegram</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Label</Label>
              <Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder={`${APP_CONFIG.appName} VIP Discord`} />
            </div>
            <div className="space-y-1.5">
              <Label>Invite URL</Label>
              <Input value={form.invite_url} onChange={(e) => setForm({ ...form, invite_url: e.target.value })} placeholder="https://discord.gg/..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button className="gradient-brand text-white border-0 hover:opacity-90" onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : `Add ${entitySingular.toLowerCase()}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
