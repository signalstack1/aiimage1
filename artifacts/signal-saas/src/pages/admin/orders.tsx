import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Trash2, ChevronDown, ChevronUp, ShoppingBag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { APP_CONFIG } from "@/config/app";

interface Order {
  id: string;
  customer_name: string;
  email: string;
  phone: string;
  items_summary: string;
  total_amount: string;
  delivery_type: string;
  address: string;
  status: string;
  notes: string;
  created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  new: "bg-primary/10 text-primary",
  preparing: "bg-amber-500/10 text-amber-400",
  ready: "bg-violet-500/10 text-violet-400",
  completed: "bg-emerald-500/10 text-emerald-400",
  cancelled: "bg-destructive/10 text-destructive",
};

const EMPTY_FORM = { customer_name: "", email: "", phone: "", items_summary: "", total_amount: "", delivery_type: "delivery", address: "", status: "new", notes: "" };

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return "just now";
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function AdminOrdersPage() {
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const token = sessionStorage.getItem("admin_token") || "";
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  const { singular, plural } = APP_CONFIG.admin.orders;

  const load = () =>
    fetch("/api/admin/orders", { headers })
      .then((r) => r.json()).then(setOrders).catch(() => setOrders([])).finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const updateOrder = async (id: string, patch: Partial<Order>) => {
    setOrders((prev) => prev.map((o) => o.id === id ? { ...o, ...patch } : o));
    await fetch(`/api/admin/orders/${id}`, { method: "PATCH", headers, body: JSON.stringify(patch) });
  };

  const handleCreate = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/orders", { method: "POST", headers, body: JSON.stringify(form) });
      if (!res.ok) throw new Error();
      toast({ title: "Order created" });
      setDialogOpen(false);
      load();
    } catch { toast({ title: "Error", variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this order?")) return;
    await fetch(`/api/admin/orders/${id}`, { method: "DELETE", headers });
    setOrders((prev) => prev.filter((o) => o.id !== id));
    toast({ title: "Deleted" });
  };

  const activeCount = orders.filter((o) => !["completed","cancelled"].includes(o.status)).length;

  return (
    <AdminLayout>
      <div className="p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><ShoppingBag className="w-6 h-6" /> {plural}</h1>
            <p className="text-sm text-muted-foreground mt-1">{orders.length} total · {activeCount} active</p>
          </div>
          <Button onClick={() => { setForm(EMPTY_FORM); setDialogOpen(true); }} className="gap-2"><Plus className="w-4 h-4" /> New {singular}</Button>
        </div>

        {loading ? (
          <div className="space-y-3">{[1,2,3].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>
        ) : !orders.length ? (
          <div className="border border-dashed border-border rounded-xl py-16 text-center">
            <ShoppingBag className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No orders yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {orders.map((o) => {
              const open = expanded === o.id;
              return (
                <div key={o.id} className="bg-card border border-border rounded-xl overflow-hidden">
                  <div className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-muted/10" onClick={() => setExpanded(open ? null : o.id)}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{o.customer_name || "Guest"}</p>
                        {o.total_amount && <span className="text-xs font-semibold text-primary">{o.total_amount}</span>}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{o.items_summary || "No items listed"}</p>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded border border-border">{o.delivery_type}</span>
                    <Select value={o.status} onValueChange={(v) => updateOrder(o.id, { status: v })} >
                      <SelectTrigger className="w-32 h-7 text-xs" onClick={(e) => e.stopPropagation()}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["new","preparing","ready","completed","cancelled"].map((s) => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">{timeAgo(o.created_at)}</span>
                    {open ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
                  </div>
                  {open && (
                    <div className="border-t border-border px-5 py-4 space-y-3">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                        {o.email && <div><span className="text-muted-foreground">Email</span><p className="font-medium break-all">{o.email}</p></div>}
                        {o.phone && <div><span className="text-muted-foreground">Phone</span><p className="font-medium">{o.phone}</p></div>}
                        {o.address && <div className="md:col-span-2"><span className="text-muted-foreground">Address</span><p className="font-medium">{o.address}</p></div>}
                      </div>
                      {o.notes && <div className="bg-muted/30 rounded-lg p-3 text-sm text-muted-foreground">{o.notes}</div>}
                      <div className="flex justify-end">
                        <Button size="icon" variant="ghost" className="w-7 h-7 text-destructive hover:text-destructive" onClick={() => handleDelete(o.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New {singular}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label className="text-xs">Customer name</Label><Input value={form.customer_name} onChange={(e) => setForm((f) => ({ ...f, customer_name: e.target.value }))} /></div>
              <div className="space-y-1"><Label className="text-xs">Phone</Label><Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} /></div>
              <div className="space-y-1 col-span-2"><Label className="text-xs">Email</Label><Input value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} /></div>
            </div>
            <div className="space-y-1"><Label className="text-xs">Items summary</Label><Textarea value={form.items_summary} onChange={(e) => setForm((f) => ({ ...f, items_summary: e.target.value }))} rows={2} placeholder="2x Burger, 1x Chips…" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label className="text-xs">Total</Label><Input value={form.total_amount} onChange={(e) => setForm((f) => ({ ...f, total_amount: e.target.value }))} placeholder="£24.99" /></div>
              <div className="space-y-1"><Label className="text-xs">Type</Label>
                <Select value={form.delivery_type} onValueChange={(v) => setForm((f) => ({ ...f, delivery_type: v }))}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="delivery">Delivery</SelectItem><SelectItem value="collection">Collection</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1"><Label className="text-xs">Address</Label><Input value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} /></div>
            <div className="space-y-1"><Label className="text-xs">Notes</Label><Textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving}>{saving ? "Saving…" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
