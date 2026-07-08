import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronDown, ChevronUp, Trash2, ClipboardList } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { APP_CONFIG } from "@/config/app";

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  service_needed: string;
  message: string;
  status: string;
  admin_notes: string;
  created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  new: "bg-primary/10 text-primary",
  contacted: "bg-amber-500/10 text-amber-400",
  quoted: "bg-violet-500/10 text-violet-400",
  won: "bg-emerald-500/10 text-emerald-400",
  lost: "bg-muted text-muted-foreground",
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return "just now";
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function AdminLeadsPage() {
  const { toast } = useToast();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});
  const token = sessionStorage.getItem("admin_token") || "";
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  const { plural } = APP_CONFIG.admin.leads;

  const load = () =>
    fetch("/api/admin/leads", { headers })
      .then((r) => r.json()).then(setLeads).catch(() => setLeads([])).finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const updateLead = async (id: string, patch: Partial<Lead>) => {
    setLeads((prev) => prev.map((l) => l.id === id ? { ...l, ...patch } : l));
    await fetch(`/api/admin/leads/${id}`, { method: "PATCH", headers, body: JSON.stringify(patch) });
  };

  const saveNotes = (lead: Lead) => {
    const notes = notesDraft[lead.id] ?? lead.admin_notes ?? "";
    updateLead(lead.id, { admin_notes: notes });
    toast({ title: "Notes saved" });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this lead?")) return;
    await fetch(`/api/admin/leads/${id}`, { method: "DELETE", headers });
    setLeads((prev) => prev.filter((l) => l.id !== id));
    toast({ title: "Deleted" });
  };

  const newCount = leads.filter((l) => l.status === "new").length;

  return (
    <AdminLayout>
      <div className="p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><ClipboardList className="w-6 h-6" /> {plural}</h1>
            <p className="text-sm text-muted-foreground mt-1">{leads.length} total · {newCount} new</p>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">{[1,2,3,4].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>
        ) : !leads.length ? (
          <div className="border border-dashed border-border rounded-xl py-16 text-center">
            <ClipboardList className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No leads yet. They appear here when someone submits the quote form.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {leads.map((lead) => {
              const open = expanded === lead.id;
              return (
                <div key={lead.id} className="bg-card border border-border rounded-xl overflow-hidden">
                  <div
                    className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-muted/10"
                    onClick={() => setExpanded(open ? null : lead.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-sm">{lead.name || "Anonymous"}</p>
                        {lead.service_needed && <span className="text-xs text-muted-foreground">· {lead.service_needed}</span>}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{lead.email} {lead.phone ? `· ${lead.phone}` : ""}</p>
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[lead.status] || "bg-muted text-muted-foreground"}`}>{lead.status}</span>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">{timeAgo(lead.created_at)}</span>
                    {open ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
                  </div>

                  {open && (
                    <div className="border-t border-border px-5 py-4 space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                        {lead.email && <div><span className="text-muted-foreground">Email</span><p className="font-medium break-all">{lead.email}</p></div>}
                        {lead.phone && <div><span className="text-muted-foreground">Phone</span><p className="font-medium">{lead.phone}</p></div>}
                        {lead.location && <div><span className="text-muted-foreground">Location</span><p className="font-medium">{lead.location}</p></div>}
                        {lead.service_needed && <div><span className="text-muted-foreground">Service</span><p className="font-medium">{lead.service_needed}</p></div>}
                      </div>
                      {lead.message && (
                        <div className="bg-muted/30 rounded-lg p-3 text-sm text-muted-foreground">{lead.message}</div>
                      )}
                      <div className="flex items-start gap-4 flex-wrap">
                        <div className="space-y-1.5">
                          <p className="text-xs text-muted-foreground">Status</p>
                          <Select value={lead.status} onValueChange={(v) => updateLead(lead.id, { status: v })}>
                            <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {["new","contacted","quoted","won","lost"].map((s) => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex-1 min-w-48 space-y-1.5">
                          <p className="text-xs text-muted-foreground">Admin notes</p>
                          <div className="flex gap-2">
                            <Textarea
                              rows={2}
                              className="text-xs"
                              value={notesDraft[lead.id] ?? lead.admin_notes ?? ""}
                              onChange={(e) => setNotesDraft((p) => ({ ...p, [lead.id]: e.target.value }))}
                              placeholder="Add notes…"
                            />
                            <Button size="sm" variant="outline" className="self-end h-8 text-xs" onClick={() => saveNotes(lead)}>Save</Button>
                          </div>
                        </div>
                        <Button size="icon" variant="ghost" className="w-7 h-7 text-destructive hover:text-destructive self-end" onClick={() => handleDelete(lead.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
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
