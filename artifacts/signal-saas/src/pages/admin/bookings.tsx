import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronDown, ChevronUp, Trash2, CalendarCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { APP_CONFIG } from "@/config/app";

interface Booking {
  id: string;
  customer_name: string;
  email: string;
  phone: string;
  service: string;
  preferred_date: string;
  preferred_time: string;
  message: string;
  status: string;
  admin_notes: string;
  created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  requested: "bg-primary/10 text-primary",
  confirmed: "bg-emerald-500/10 text-emerald-400",
  cancelled: "bg-destructive/10 text-destructive",
  completed: "bg-muted text-muted-foreground",
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return "just now";
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function AdminBookingsPage() {
  const { toast } = useToast();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});
  const token = sessionStorage.getItem("admin_token") || "";
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  const { plural } = APP_CONFIG.admin.bookings;

  const load = () =>
    fetch("/api/admin/bookings", { headers })
      .then((r) => r.json()).then(setBookings).catch(() => setBookings([])).finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const updateBooking = async (id: string, patch: Partial<Booking>) => {
    setBookings((prev) => prev.map((b) => b.id === id ? { ...b, ...patch } : b));
    await fetch(`/api/admin/bookings/${id}`, { method: "PATCH", headers, body: JSON.stringify(patch) });
  };

  const saveNotes = (b: Booking) => {
    const notes = notesDraft[b.id] ?? b.admin_notes ?? "";
    updateBooking(b.id, { admin_notes: notes });
    toast({ title: "Notes saved" });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this booking?")) return;
    await fetch(`/api/admin/bookings/${id}`, { method: "DELETE", headers });
    setBookings((prev) => prev.filter((b) => b.id !== id));
    toast({ title: "Deleted" });
  };

  const requested = bookings.filter((b) => b.status === "requested").length;

  return (
    <AdminLayout>
      <div className="p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><CalendarCheck className="w-6 h-6" /> {plural}</h1>
            <p className="text-sm text-muted-foreground mt-1">{bookings.length} total · {requested} pending</p>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">{[1,2,3].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>
        ) : !bookings.length ? (
          <div className="border border-dashed border-border rounded-xl py-16 text-center">
            <CalendarCheck className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No bookings yet. They appear here when someone submits the booking form.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {bookings.map((b) => {
              const open = expanded === b.id;
              return (
                <div key={b.id} className="bg-card border border-border rounded-xl overflow-hidden">
                  <div
                    className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-muted/10"
                    onClick={() => setExpanded(open ? null : b.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{b.customer_name || "Guest"}</p>
                        {b.service && <span className="text-xs text-muted-foreground">· {b.service}</span>}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {b.preferred_date}{b.preferred_time ? ` at ${b.preferred_time}` : ""}
                        {b.email ? ` · ${b.email}` : ""}
                      </p>
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[b.status] || "bg-muted text-muted-foreground"}`}>{b.status}</span>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">{timeAgo(b.created_at)}</span>
                    {open ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
                  </div>

                  {open && (
                    <div className="border-t border-border px-5 py-4 space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                        {b.email && <div><span className="text-muted-foreground">Email</span><p className="font-medium break-all">{b.email}</p></div>}
                        {b.phone && <div><span className="text-muted-foreground">Phone</span><p className="font-medium">{b.phone}</p></div>}
                        {b.preferred_date && <div><span className="text-muted-foreground">Date</span><p className="font-medium">{b.preferred_date}</p></div>}
                        {b.preferred_time && <div><span className="text-muted-foreground">Time</span><p className="font-medium">{b.preferred_time}</p></div>}
                      </div>
                      {b.message && <div className="bg-muted/30 rounded-lg p-3 text-sm text-muted-foreground">{b.message}</div>}
                      <div className="flex items-start gap-4 flex-wrap">
                        <div className="space-y-1.5">
                          <p className="text-xs text-muted-foreground">Status</p>
                          <Select value={b.status} onValueChange={(v) => updateBooking(b.id, { status: v })}>
                            <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {["requested","confirmed","cancelled","completed"].map((s) => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex-1 min-w-48 space-y-1.5">
                          <p className="text-xs text-muted-foreground">Admin notes</p>
                          <div className="flex gap-2">
                            <Textarea rows={2} className="text-xs"
                              value={notesDraft[b.id] ?? b.admin_notes ?? ""}
                              onChange={(e) => setNotesDraft((p) => ({ ...p, [b.id]: e.target.value }))}
                              placeholder="Add notes…"
                            />
                            <Button size="sm" variant="outline" className="self-end h-8 text-xs" onClick={() => saveNotes(b)}>Save</Button>
                          </div>
                        </div>
                        <Button size="icon" variant="ghost" className="w-7 h-7 text-destructive hover:text-destructive self-end" onClick={() => handleDelete(b.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
