import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronDown, ChevronUp, Trash2, ClipboardList, Plus, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const BASE_URL = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

// VIA pipeline stages
const STAGES = ["new", "contacted", "replied", "interested", "converted", "dead"] as const;

const STAGE_LABELS: Record<string, string> = {
  new:       "New",
  contacted: "Contacted",
  replied:   "Replied",
  interested:"Interested",
  converted: "Converted",
  dead:      "Dead",
};

const STAGE_COLORS: Record<string, string> = {
  new:        "bg-sky-500/10 text-sky-400",
  contacted:  "bg-violet-500/10 text-violet-400",
  replied:    "bg-amber-500/10 text-amber-400",
  interested: "bg-primary/10 text-primary",
  converted:  "bg-emerald-500/10 text-emerald-400",
  dead:       "bg-muted text-muted-foreground",
};

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

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return "just now";
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

interface AddLeadForm {
  name: string; email: string; phone: string;
  location: string; service_needed: string; message: string;
}

export default function AdminLeadsPage() {
  const { toast } = useToast();
  const [leads, setLeads]         = useState<Lead[]>([]);
  const [loading, setLoading]     = useState(true);
  const [expanded, setExpanded]   = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [showAdd, setShowAdd]     = useState(false);
  const [addForm, setAddForm]     = useState<AddLeadForm>({ name: "", email: "", phone: "", location: "", service_needed: "", message: "" });
  const [addSaving, setAddSaving] = useState(false);

  const token = sessionStorage.getItem("admin_token") || "";
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  const load = () => {
    setLoading(true);
    fetch(`${BASE_URL}/api/admin/leads`, { headers })
      .then((r) => r.json())
      .then((d) => setLeads(Array.isArray(d) ? d : []))
      .catch(() => setLeads([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const updateLead = async (id: string, patch: Partial<Lead>) => {
    setLeads((prev) => prev.map((l) => l.id === id ? { ...l, ...patch } : l));
    await fetch(`${BASE_URL}/api/admin/leads/${id}`, { method: "PATCH", headers, body: JSON.stringify(patch) });
  };

  const saveNotes = (lead: Lead) => {
    const notes = notesDraft[lead.id] ?? lead.admin_notes ?? "";
    updateLead(lead.id, { admin_notes: notes });
    toast({ title: "Notes saved" });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this lead?")) return;
    await fetch(`${BASE_URL}/api/admin/leads/${id}`, { method: "DELETE", headers });
    setLeads((prev) => prev.filter((l) => l.id !== id));
    toast({ title: "Deleted" });
  };

  const handleAddLead = async () => {
    if (!addForm.name.trim() && !addForm.email.trim()) {
      toast({ title: "Name or email required", variant: "destructive" }); return;
    }
    setAddSaving(true);
    try {
      const res = await fetch(`${BASE_URL}/api/admin/leads`, {
        method: "POST",
        headers,
        body: JSON.stringify({ ...addForm, status: "new" }),
      });
      const newLead = await res.json();
      if (res.ok) {
        setLeads((prev) => [newLead, ...prev]);
        setAddForm({ name: "", email: "", phone: "", location: "", service_needed: "", message: "" });
        setShowAdd(false);
        toast({ title: "Lead added" });
      } else {
        throw new Error(newLead.error || "Failed");
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally { setAddSaving(false); }
  };

  const stages = STAGES;
  const filtered = stageFilter === "all" ? leads : leads.filter((l) => l.status === stageFilter);
  const counts: Record<string, number> = { all: leads.length };
  leads.forEach((l) => { counts[l.status] = (counts[l.status] ?? 0) + 1; });

  return (
    <AdminLayout>
      <div className="p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ClipboardList className="w-6 h-6" /> Lead Pipeline
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {leads.length} total · {counts["new"] ?? 0} new · {counts["interested"] ?? 0} interested
            </p>
          </div>
          <Button size="sm" onClick={() => setShowAdd((v) => !v)} variant={showAdd ? "outline" : "default"}>
            {showAdd ? <><X className="w-3.5 h-3.5 mr-1.5" />Cancel</> : <><Plus className="w-3.5 h-3.5 mr-1.5" />Add Lead</>}
          </Button>
        </div>

        {/* Add Lead form */}
        {showAdd && (
          <div className="bg-card border border-border rounded-xl p-6 mb-6 space-y-4">
            <h2 className="font-semibold text-sm">Add new lead</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {(["name","email","phone","location","service_needed"] as const).map((field) => (
                <div key={field} className="space-y-1">
                  <Label htmlFor={`add-${field}`} className="text-xs capitalize">{field.replace("_", " ")}</Label>
                  <Input
                    id={`add-${field}`}
                    value={addForm[field]}
                    onChange={(e) => setAddForm((p) => ({ ...p, [field]: e.target.value }))}
                    className="text-sm"
                    placeholder={field.replace("_", " ")}
                  />
                </div>
              ))}
            </div>
            <div className="space-y-1">
              <Label htmlFor="add-message" className="text-xs">Notes</Label>
              <Textarea
                id="add-message"
                rows={2}
                className="text-sm"
                value={addForm.message}
                onChange={(e) => setAddForm((p) => ({ ...p, message: e.target.value }))}
                placeholder="Any notes about this lead…"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button size="sm" onClick={handleAddLead} disabled={addSaving}>
                {addSaving ? "Saving…" : "Add lead"}
              </Button>
            </div>
          </div>
        )}

        {/* Stage filter tabs */}
        <div className="flex items-center gap-1 mb-5 overflow-x-auto pb-1">
          <button
            onClick={() => setStageFilter("all")}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${stageFilter === "all" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-accent/50"}`}
          >
            All {counts.all > 0 && <span className="ml-1 text-xs opacity-70">({counts.all})</span>}
          </button>
          {stages.map((s) => (
            <button
              key={s}
              onClick={() => setStageFilter(s)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${stageFilter === s ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-accent/50"}`}
            >
              {STAGE_LABELS[s]} {counts[s] ? <span className="ml-1 text-xs opacity-70">({counts[s]})</span> : ""}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">{[1,2,3,4].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>
        ) : !filtered.length ? (
          <div className="border border-dashed border-border rounded-xl py-16 text-center">
            <ClipboardList className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              {stageFilter === "all" ? "No leads yet." : `No leads in '${STAGE_LABELS[stageFilter]}' stage.`}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((lead) => {
              const open = expanded === lead.id;
              const stageCls = STAGE_COLORS[lead.status] ?? "bg-muted text-muted-foreground";
              return (
                <div key={lead.id} className="bg-card border border-border rounded-xl overflow-hidden">
                  <div
                    className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-muted/10"
                    onClick={() => setExpanded(open ? null : lead.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-sm">{lead.name || lead.email || "Unknown"}</p>
                        {lead.service_needed && <span className="text-xs text-muted-foreground">· {lead.service_needed}</span>}
                        {lead.location && <span className="text-xs text-muted-foreground">· {lead.location}</span>}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{lead.email} {lead.phone ? `· ${lead.phone}` : ""}</p>
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${stageCls}`}>
                      {STAGE_LABELS[lead.status] ?? lead.status}
                    </span>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">{timeAgo(lead.created_at)}</span>
                    {open ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
                  </div>

                  {open && (
                    <div className="border-t border-border px-5 py-4 space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                        {lead.email     && <div><span className="text-muted-foreground block mb-0.5">Email</span><p className="font-medium break-all">{lead.email}</p></div>}
                        {lead.phone     && <div><span className="text-muted-foreground block mb-0.5">Phone</span><p className="font-medium">{lead.phone}</p></div>}
                        {lead.location  && <div><span className="text-muted-foreground block mb-0.5">Location</span><p className="font-medium">{lead.location}</p></div>}
                        {lead.service_needed && <div><span className="text-muted-foreground block mb-0.5">Trade</span><p className="font-medium">{lead.service_needed}</p></div>}
                      </div>
                      {lead.message && (
                        <div className="bg-muted/30 rounded-lg p-3 text-sm text-muted-foreground">{lead.message}</div>
                      )}
                      <div className="flex items-start gap-4 flex-wrap">
                        <div className="space-y-1.5">
                          <p className="text-xs text-muted-foreground">Stage</p>
                          <Select value={lead.status} onValueChange={(v) => updateLead(lead.id, { status: v })}>
                            <SelectTrigger className="w-40 h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {stages.map((s) => <SelectItem key={s} value={s} className="text-xs">{STAGE_LABELS[s]}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex-1 min-w-48 space-y-1.5">
                          <p className="text-xs text-muted-foreground">Notes</p>
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
                        <Button size="icon" variant="ghost" className="w-7 h-7 text-destructive hover:text-destructive self-end" onClick={() => handleDelete(lead.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
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
