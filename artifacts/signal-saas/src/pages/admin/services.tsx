import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Trash2, Pencil, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { APP_CONFIG } from "@/config/app";

interface Service {
  id: string;
  name: string;
  description: string;
  image_url: string;
  category: string;
  starting_price: string;
  cta_type: string;
  is_active: boolean;
  is_featured: boolean;
  sort_order: number;
}

const EMPTY_FORM = { name: "", description: "", image_url: "", category: "", starting_price: "", cta_type: "quote", is_active: true, is_featured: false, sort_order: 0 };
const CTA_LABELS: Record<string, string> = { book: "Book Now", quote: "Request Quote", call: "Call Now", whatsapp: "WhatsApp" };

export default function AdminServicesPage() {
  const { toast } = useToast();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [form, setForm] = useState<typeof EMPTY_FORM>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const token = sessionStorage.getItem("admin_token") || "";
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  const { singular, plural } = APP_CONFIG.admin.services;

  const load = () =>
    fetch("/api/admin/services", { headers })
      .then((r) => r.json()).then(setServices).catch(() => setServices([])).finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setForm(EMPTY_FORM); setDialogOpen(true); };
  const openEdit = (s: Service) => { setEditing(s); setForm({ name: s.name, description: s.description || "", image_url: s.image_url || "", category: s.category || "", starting_price: s.starting_price || "", cta_type: s.cta_type, is_active: s.is_active, is_featured: s.is_featured, sort_order: s.sort_order }); setDialogOpen(true); };

  const handleSave = async () => {
    if (!form.name.trim()) { toast({ title: "Name required", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const url = editing ? `/api/admin/services/${editing.id}` : "/api/admin/services";
      const method = editing ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers, body: JSON.stringify(form) });
      if (!res.ok) throw new Error();
      toast({ title: editing ? "Updated" : "Created", description: `${singular} saved.` });
      setDialogOpen(false);
      load();
    } catch { toast({ title: "Error", description: "Could not save.", variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(`Delete this ${singular.toLowerCase()}?`)) return;
    await fetch(`/api/admin/services/${id}`, { method: "DELETE", headers });
    setServices((prev) => prev.filter((s) => s.id !== id));
    toast({ title: "Deleted" });
  };

  const toggleField = async (id: string, field: "is_active" | "is_featured", value: boolean) => {
    setServices((prev) => prev.map((s) => s.id === id ? { ...s, [field]: value } : s));
    await fetch(`/api/admin/services/${id}`, { method: "PATCH", headers, body: JSON.stringify({ [field]: value }) });
  };

  return (
    <AdminLayout>
      <div className="p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">{plural}</h1>
            <p className="text-sm text-muted-foreground mt-1">{services.length} total · {services.filter((s) => s.is_active).length} active</p>
          </div>
          <Button onClick={openNew} className="gap-2"><Plus className="w-4 h-4" /> Add {singular}</Button>
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-5 space-y-3">{[1,2,3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : !services.length ? (
            <p className="p-10 text-sm text-muted-foreground text-center">No {plural.toLowerCase()} yet. Add your first one.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/20">
                <tr>
                  <th className="text-left px-5 py-3 text-xs text-muted-foreground font-medium">Name</th>
                  <th className="text-left px-5 py-3 text-xs text-muted-foreground font-medium">Category</th>
                  <th className="text-left px-5 py-3 text-xs text-muted-foreground font-medium">Starting price</th>
                  <th className="text-left px-5 py-3 text-xs text-muted-foreground font-medium">CTA</th>
                  <th className="text-center px-5 py-3 text-xs text-muted-foreground font-medium">Featured</th>
                  <th className="text-center px-5 py-3 text-xs text-muted-foreground font-medium">Active</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {services.map((s) => (
                  <tr key={s.id} className="hover:bg-muted/10">
                    <td className="px-5 py-3">
                      <p className="font-medium">{s.name}</p>
                      {s.description && <p className="text-xs text-muted-foreground truncate max-w-xs">{s.description}</p>}
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{s.category || "—"}</td>
                    <td className="px-5 py-3 text-muted-foreground">{s.starting_price || "—"}</td>
                    <td className="px-5 py-3"><Badge variant="outline" className="text-xs">{CTA_LABELS[s.cta_type] || s.cta_type}</Badge></td>
                    <td className="px-5 py-3 text-center">
                      <Switch checked={s.is_featured} onCheckedChange={(v) => toggleField(s.id, "is_featured", v)} />
                    </td>
                    <td className="px-5 py-3 text-center">
                      <Switch checked={s.is_active} onCheckedChange={(v) => toggleField(s.id, "is_active", v)} />
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <Button size="icon" variant="ghost" className="w-7 h-7" onClick={() => openEdit(s)}><Pencil className="w-3.5 h-3.5" /></Button>
                        <Button size="icon" variant="ghost" className="w-7 h-7 text-destructive hover:text-destructive" onClick={() => handleDelete(s.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? `Edit ${singular}` : `New ${singular}`}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5"><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Roof Repair" /></div>
            <div className="space-y-1.5"><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={3} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Category</Label><Input value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} placeholder="e.g. Roofing" /></div>
              <div className="space-y-1.5"><Label>Starting price</Label><Input value={form.starting_price} onChange={(e) => setForm((f) => ({ ...f, starting_price: e.target.value }))} placeholder="From £150" /></div>
            </div>
            <div className="space-y-1.5"><Label>Image URL</Label><Input value={form.image_url} onChange={(e) => setForm((f) => ({ ...f, image_url: e.target.value }))} placeholder="https://…" /></div>
            <div className="space-y-1.5">
              <Label>CTA type</Label>
              <Select value={form.cta_type} onValueChange={(v) => setForm((f) => ({ ...f, cta_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="quote">Request Quote</SelectItem>
                  <SelectItem value="book">Book Now</SelectItem>
                  <SelectItem value="call">Call Now</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Switch checked={form.is_active} onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))} /> Active
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Switch checked={form.is_featured} onCheckedChange={(v) => setForm((f) => ({ ...f, is_featured: v }))} /><Star className="w-3.5 h-3.5 text-amber-400" /> Featured
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
