import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronDown, ChevronUp, Trash2, ClipboardList, Plus, X, Globe, MapPin, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const BASE_URL = import.meta.env.VITE_API_URL || "";

const STAGES = ["new", "contacted", "replied", "interested", "converted", "dead"] as const;
type Stage = typeof STAGES[number];

const STAGE_LABELS: Record<string, string> = {
  new:        "New",
  contacted:  "Contacted",
  replied:    "Replied",
  interested: "Interested",
  converted:  "Converted",
  dead:       "Dead",
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
  business_name: string;
  email: string;
  phone: string;
  trade: string;
  town: string;
  website: string;
  location: string;
  service_needed: string;
  message: string;
  stage: Stage;
  last_contacted_at: string | null;
  created_at: string;
  updated_at: string;
}

interface AddLeadForm {
  name: string;
  business_name: string;
  email: string;
  phone: string;
  trade: string;
  town: string;
  website: string;
  message: string;
}

const EMPTY_FORM: AddLeadForm = {
  name: "", business_name: "", email: "", phone: "",
  trade: "", town: "", website: "", message: "",
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d < 30 ? `${d}d ago` : new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function fmtDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function getStage(l: Lead): Stage {
  return (l.stage ?? (l as any).status ?? "new") as Stage;
}

export default function AdminLeadsPage() {
  const { toast } = useToast();
  const [leads, setLeads]           = useState<Lead[]>([]);
  const [loading, setLoading]       = useState(true);
  const [expanded, setExpanded]     = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});
  const [lcDraft, setLcDraft]       = useState<Record<string, string>>({});
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [showAdd, setShowAdd]       = useState(false);
  const [addForm, setAddForm]       = useState<AddLeadForm>(EMPTY_FORM);
  const [addSaving, setAddSaving]   = useState(false);

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
    const draft = notesDraft[lead.id];
    if (draft === undefined) return;
    updateLead(lead.id, { message: draft });
    toast({ title: "Notes saved" });
  };

  const saveLastContacted = (lead: Lead) => {
    const v = lcDraft[lead.id];
    if (!v) return;
    const iso = new Date(v).toISOString();
    updateLead(lead.id, { last_contacted_at: iso });
    toast({ title: "Last contacted date saved" });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this lead?")) return;
    await fetch(`${BASE_URL}/api/admin/leads/${id}`, { method: "DELETE", headers });
    setLeads((prev) => prev.filter((l) => l.id !== id));
    toast({ title: "Deleted" });
  };

  const handleAddLead = async () => {
    if (!addForm.name.trim() && !addForm.email.trim() && !addForm.business_name.trim()) {
      toast({ title: "Name, business name, or email required", variant: "destructive" }); return;
    }
    setAddSaving(true);
    try {
      const res = await fetch(`${BASE_URL}/api/admin/leads`, {
        method: "POST",
        headers,
        body: JSON.stringify({ ...addForm, stage: "new" }),
      });
      const data = await res.json();
      if (res.ok) {
        setLeads((prev) => [data, ...prev]);
        setAddForm(EMPTY_FORM);
        setShowAdd(false);
        toast({ title: "Lead added" });
      } else {
        throw new Error(data.error || "Failed to add lead");
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally { setAddSaving(false); }
  };

  const filtered = stageFilter === "all" ? leads : leads.filter((l) => getStage(l) === stageFilter);
  const counts: Record<string, number> = { all: leads.length };
  leads.forEach((l) => { const s = getStage(l); counts[s] = (counts[s] ?? 0) + 1; });

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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {(["name", "business_name", "email", "phone", "trade", "town", "website"] as const).map((field) => (
                <div key={field} className="space-y-1">
                  <Label htmlFor={`add-${field}`} className="text-xs capitalize">
                    {field === "business_name" ? "Business Name" : field.charAt(0).toUpperCase() + field.slice(1)}
                  </Label>
                  <Input
                    id={`add-${field}`}
                    value={addForm[field]}
                    onChange={(e) => setAddForm((p) => ({ ...p, [field]: e.target.value }))}
                    className="text-sm"
                    placeholder={field === "website" ? "https://…" : field.replace("_", " ")}
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
          {STAGES.map((s) => (
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
              const open  = expanded === lead.id;
              const stage = getStage(lead);
              const stageCls = STAGE_COLORS[stage] ?? "bg-muted text-muted-foreground";
              const displayName = lead.business_name || lead.name || lead.email || "Unknown";
              return (
                <div key={lead.id} className="bg-card border border-border rounded-xl overflow-hidden">
                  {/* Row */}
                  <div
                    className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-muted/10"
                    onClick={() => setExpanded(open ? null : lead.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-sm">{displayName}</p>
                        {lead.trade && <span className="text-xs text-muted-foreground">· {lead.trade}</span>}
                        {(lead.town || lead.location) && (
                          <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                            <MapPin className="w-3 h-3" />{lead.town || lead.location}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {lead.email}{lead.phone ? ` · ${lead.phone}` : ""}
                        {lead.last_contacted_at && (
                          <span className="ml-2 text-muted-foreground/60">Last contacted {fmtDate(lead.last_contacted_at)}</span>
                        )}
                      </p>
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${stageCls}`}>
                      {STAGE_LABELS[stage] ?? stage}
                    </span>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">{timeAgo(lead.created_at)}</span>
                    {open ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
                  </div>

                  {/* Expanded detail */}
                  {open && (
                    <div className="border-t border-border px-5 py-4 space-y-4">
                      {/* Field grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                        {lead.email         && <div><span className="text-muted-foreground block mb-0.5">Email</span><p className="font-medium break-all">{lead.email}</p></div>}
                        {lead.phone         && <div><span className="text-muted-foreground block mb-0.5">Phone</span><p className="font-medium">{lead.phone}</p></div>}
                        {(lead.town || lead.location) && <div><span className="text-muted-foreground block mb-0.5">Town</span><p className="font-medium">{lead.town || lead.location}</p></div>}
                        {(lead.trade || lead.service_needed) && <div><span className="text-muted-foreground block mb-0.5">Trade</span><p className="font-medium">{lead.trade || lead.service_needed}</p></div>}
                        {lead.website       && (
                          <div className="col-span-2">
                            <span className="text-muted-foreground block mb-0.5">Website</span>
                            <a href={lead.website} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline flex items-center gap-1">
                              <Globe className="w-3 h-3" />{lead.website.replace(/^https?:\/\//, "")}
                            </a>
                          </div>
                        )}
                      </div>

                      {lead.message && (
                        <div className="bg-muted/30 rounded-lg p-3 text-sm text-muted-foreground">{lead.message}</div>
                      )}

                      <div className="flex items-start gap-4 flex-wrap">
                        {/* Stage dropdown */}
                        <div className="space-y-1.5">
                          <p className="text-xs text-muted-foreground">Stage</p>
                          <Select value={stage} onValueChange={(v) => updateLead(lead.id, { stage: v as Stage })}>
                            <SelectTrigger className="w-40 h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {STAGES.map((s) => <SelectItem key={s} value={s} className="text-xs">{STAGE_LABELS[s]}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Last contacted */}
                        <div className="space-y-1.5">
                          <p className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3" />Last contacted</p>
                          <div className="flex items-center gap-2">
                            <Input
                              type="date"
                              className="h-8 text-xs w-36"
                              value={lcDraft[lead.id] ?? (lead.last_contacted_at ? lead.last_contacted_at.slice(0, 10) : "")}
                              onChange={(e) => setLcDraft((p) => ({ ...p, [lead.id]: e.target.value }))}
                            />
                            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => saveLastContacted(lead)}>Save</Button>
                          </div>
                        </div>

                        {/* Notes */}
                        <div className="flex-1 min-w-48 space-y-1.5">
                          <p className="text-xs text-muted-foreground">Notes</p>
                          <div className="flex gap-2">
                            <Textarea
                              rows={2}
                              className="text-xs"
                              value={notesDraft[lead.id] ?? lead.message ?? ""}
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
