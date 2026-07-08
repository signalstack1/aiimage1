import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Trash2, Pencil, Image } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { APP_CONFIG } from "@/config/app";

interface GalleryItem {
  id: string;
  title: string;
  image_url: string;
  category: string;
  description: string;
  is_featured: boolean;
  is_published: boolean;
  sort_order: number;
}

const EMPTY_FORM = { title: "", image_url: "", category: "", description: "", is_featured: false, is_published: false, sort_order: 0 };

export default function AdminGalleryPage() {
  const { toast } = useToast();
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<GalleryItem | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const token = sessionStorage.getItem("admin_token") || "";
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  const { singular, plural } = APP_CONFIG.admin.gallery;

  const load = () =>
    fetch("/api/admin/gallery", { headers })
      .then((r) => r.json()).then(setItems).catch(() => setItems([])).finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setForm(EMPTY_FORM); setDialogOpen(true); };
  const openEdit = (item: GalleryItem) => {
    setEditing(item);
    setForm({ title: item.title, image_url: item.image_url || "", category: item.category || "", description: item.description || "", is_featured: item.is_featured, is_published: item.is_published, sort_order: item.sort_order });
    setDialogOpen(true);
  };

  const toggle = async (id: string, field: "is_featured" | "is_published", value: boolean) => {
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, [field]: value } : i));
    await fetch(`/api/admin/gallery/${id}`, { method: "PATCH", headers, body: JSON.stringify({ [field]: value }) });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const url = editing ? `/api/admin/gallery/${editing.id}` : "/api/admin/gallery";
      const method = editing ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers, body: JSON.stringify(form) });
      if (!res.ok) throw new Error();
      toast({ title: editing ? "Updated" : "Added", description: `${singular} saved.` });
      setDialogOpen(false);
      load();
    } catch { toast({ title: "Error", variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(`Delete this ${singular.toLowerCase()}?`)) return;
    await fetch(`/api/admin/gallery/${id}`, { method: "DELETE", headers });
    setItems((prev) => prev.filter((i) => i.id !== id));
    toast({ title: "Deleted" });
  };

  const publishedCount = items.filter((i) => i.is_published).length;

  return (
    <AdminLayout>
      <div className="p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><Image className="w-6 h-6" /> {plural}</h1>
            <p className="text-sm text-muted-foreground mt-1">{items.length} total · {publishedCount} published</p>
          </div>
          <Button onClick={openNew} className="gap-2"><Plus className="w-4 h-4" /> Add {singular}</Button>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[1,2,3,4,5,6].map((i) => <Skeleton key={i} className="aspect-square rounded-xl" />)}
          </div>
        ) : !items.length ? (
          <div className="border border-dashed border-border rounded-xl py-16 text-center">
            <Image className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No {plural.toLowerCase()} items yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {items.map((item) => (
              <div key={item.id} className="bg-card border border-border rounded-xl overflow-hidden group">
                <div className="aspect-square bg-muted/30 relative overflow-hidden">
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"><Image className="w-8 h-8 text-muted-foreground/30" /></div>
                  )}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button size="icon" variant="secondary" className="w-8 h-8" onClick={() => openEdit(item)}><Pencil className="w-3.5 h-3.5" /></Button>
                    <Button size="icon" variant="destructive" className="w-8 h-8" onClick={() => handleDelete(item.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                </div>
                <div className="p-3 space-y-2">
                  <p className="text-sm font-medium truncate">{item.title || "Untitled"}</p>
                  {item.category && <p className="text-xs text-muted-foreground">{item.category}</p>}
                  <div className="flex gap-3">
                    <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                      <Switch checked={item.is_published} onCheckedChange={(v) => toggle(item.id, "is_published", v)} className="scale-75 origin-left" /> Published
                    </label>
                    <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                      <Switch checked={item.is_featured} onCheckedChange={(v) => toggle(item.id, "is_featured", v)} className="scale-75 origin-left" /> Featured
                    </label>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? `Edit ${singular}` : `Add ${singular}`}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5"><Label>Title</Label><Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Kitchen renovation" /></div>
            <div className="space-y-1.5"><Label>Image URL</Label><Input value={form.image_url} onChange={(e) => setForm((f) => ({ ...f, image_url: e.target.value }))} placeholder="https://…" /></div>
            <div className="space-y-1.5"><Label>Category</Label><Input value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} placeholder="e.g. Before & After" /></div>
            <div className="space-y-1.5"><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={2} /></div>
            <div className="space-y-1.5"><Label>Sort order</Label><Input type="number" value={form.sort_order} onChange={(e) => setForm((f) => ({ ...f, sort_order: Number(e.target.value) }))} /></div>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 text-sm cursor-pointer"><Switch checked={form.is_published} onCheckedChange={(v) => setForm((f) => ({ ...f, is_published: v }))} /> Published</label>
              <label className="flex items-center gap-2 text-sm cursor-pointer"><Switch checked={form.is_featured} onCheckedChange={(v) => setForm((f) => ({ ...f, is_featured: v }))} /> Featured</label>
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
