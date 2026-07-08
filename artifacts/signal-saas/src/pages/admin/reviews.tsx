import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Trash2, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { APP_CONFIG } from "@/config/app";

interface Review {
  id: string;
  customer_name: string;
  rating: number;
  review_text: string;
  source: string;
  is_featured: boolean;
  is_published: boolean;
  created_at: string;
}

const EMPTY_FORM = { customer_name: "", rating: 5, review_text: "", source: "", is_featured: false, is_published: false };

function Stars({ n }: { n: number }) {
  return <span className="text-amber-400">{Array.from({ length: 5 }, (_, i) => i < n ? "★" : "☆").join("")}</span>;
}

export default function AdminReviewsPage() {
  const { toast } = useToast();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const token = sessionStorage.getItem("admin_token") || "";
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  const { singular, plural } = APP_CONFIG.admin.reviews;

  const load = () =>
    fetch("/api/admin/reviews", { headers })
      .then((r) => r.json()).then(setReviews).catch(() => setReviews([])).finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const toggle = async (id: string, field: "is_featured" | "is_published", value: boolean) => {
    setReviews((prev) => prev.map((r) => r.id === id ? { ...r, [field]: value } : r));
    await fetch(`/api/admin/reviews/${id}`, { method: "PATCH", headers, body: JSON.stringify({ [field]: value }) });
  };

  const handleCreate = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/reviews", { method: "POST", headers, body: JSON.stringify(form) });
      if (!res.ok) throw new Error();
      toast({ title: `${singular} added` });
      setDialogOpen(false);
      setForm(EMPTY_FORM);
      load();
    } catch { toast({ title: "Error", variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(`Delete this ${singular.toLowerCase()}?`)) return;
    await fetch(`/api/admin/reviews/${id}`, { method: "DELETE", headers });
    setReviews((prev) => prev.filter((r) => r.id !== id));
    toast({ title: "Deleted" });
  };

  const publishedCount = reviews.filter((r) => r.is_published).length;

  return (
    <AdminLayout>
      <div className="p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><Star className="w-6 h-6" /> {plural}</h1>
            <p className="text-sm text-muted-foreground mt-1">{reviews.length} total · {publishedCount} published</p>
          </div>
          <Button onClick={() => { setForm(EMPTY_FORM); setDialogOpen(true); }} className="gap-2"><Plus className="w-4 h-4" /> Add {singular}</Button>
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-5 space-y-3">{[1,2,3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : !reviews.length ? (
            <p className="p-10 text-sm text-muted-foreground text-center">No {plural.toLowerCase()} yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/20">
                <tr>
                  <th className="text-left px-5 py-3 text-xs text-muted-foreground font-medium">Customer</th>
                  <th className="text-left px-5 py-3 text-xs text-muted-foreground font-medium">Rating</th>
                  <th className="text-left px-5 py-3 text-xs text-muted-foreground font-medium">Review</th>
                  <th className="text-left px-5 py-3 text-xs text-muted-foreground font-medium">Source</th>
                  <th className="text-center px-5 py-3 text-xs text-muted-foreground font-medium">Featured</th>
                  <th className="text-center px-5 py-3 text-xs text-muted-foreground font-medium">Published</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {reviews.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/10">
                    <td className="px-5 py-3 font-medium">{r.customer_name || "Anonymous"}</td>
                    <td className="px-5 py-3"><Stars n={r.rating} /></td>
                    <td className="px-5 py-3 text-muted-foreground max-w-xs">
                      <p className="truncate">{r.review_text || "—"}</p>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground text-xs">{r.source || "—"}</td>
                    <td className="px-5 py-3 text-center">
                      <Switch checked={r.is_featured} onCheckedChange={(v) => toggle(r.id, "is_featured", v)} />
                    </td>
                    <td className="px-5 py-3 text-center">
                      <Switch checked={r.is_published} onCheckedChange={(v) => toggle(r.id, "is_published", v)} />
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Button size="icon" variant="ghost" className="w-7 h-7 text-destructive hover:text-destructive" onClick={() => handleDelete(r.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add {singular}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5"><Label>Customer name</Label><Input value={form.customer_name} onChange={(e) => setForm((f) => ({ ...f, customer_name: e.target.value }))} placeholder="Jane D." /></div>
            <div className="space-y-1.5">
              <Label>Rating</Label>
              <div className="flex gap-1">
                {[1,2,3,4,5].map((n) => (
                  <button key={n} type="button" onClick={() => setForm((f) => ({ ...f, rating: n }))} className={`text-2xl transition-colors ${n <= form.rating ? "text-amber-400" : "text-muted-foreground/30"}`}>★</button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5"><Label>Review text</Label><Textarea value={form.review_text} onChange={(e) => setForm((f) => ({ ...f, review_text: e.target.value }))} rows={3} placeholder="Great service…" /></div>
            <div className="space-y-1.5"><Label>Source</Label><Input value={form.source} onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))} placeholder="Google, Facebook, direct…" /></div>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 text-sm cursor-pointer"><Switch checked={form.is_published} onCheckedChange={(v) => setForm((f) => ({ ...f, is_published: v }))} /> Published</label>
              <label className="flex items-center gap-2 text-sm cursor-pointer"><Switch checked={form.is_featured} onCheckedChange={(v) => setForm((f) => ({ ...f, is_featured: v }))} /> Featured</label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving}>{saving ? "Saving…" : "Add"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
