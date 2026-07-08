import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronDown, ChevronUp, Trash2, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { APP_CONFIG } from "@/config/app";

interface Message {
  id: string;
  name: string;
  email: string;
  subject: string;
  body: string;
  status: string;
  admin_notes: string;
  created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  unread: "bg-primary/10 text-primary",
  read: "bg-muted text-muted-foreground",
  archived: "bg-muted/50 text-muted-foreground/60",
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return "just now";
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function AdminMessagesPage() {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});
  const token = sessionStorage.getItem("admin_token") || "";
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  const { plural } = APP_CONFIG.admin.messages;

  const load = () =>
    fetch("/api/admin/messages", { headers })
      .then((r) => r.json()).then(setMessages).catch(() => setMessages([])).finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const updateMessage = async (id: string, patch: Partial<Message>) => {
    setMessages((prev) => prev.map((m) => m.id === id ? { ...m, ...patch } : m));
    await fetch(`/api/admin/messages/${id}`, { method: "PATCH", headers, body: JSON.stringify(patch) });
  };

  const openMessage = (id: string) => {
    const msg = messages.find((m) => m.id === id);
    if (msg && msg.status === "unread") updateMessage(id, { status: "read" });
    setExpanded((prev) => prev === id ? null : id);
  };

  const saveNotes = (msg: Message) => {
    updateMessage(msg.id, { admin_notes: notesDraft[msg.id] ?? msg.admin_notes ?? "" });
    toast({ title: "Notes saved" });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this message?")) return;
    await fetch(`/api/admin/messages/${id}`, { method: "DELETE", headers });
    setMessages((prev) => prev.filter((m) => m.id !== id));
    toast({ title: "Deleted" });
  };

  const unreadCount = messages.filter((m) => m.status === "unread").length;

  return (
    <AdminLayout>
      <div className="p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><MessageSquare className="w-6 h-6" /> {plural}</h1>
            <p className="text-sm text-muted-foreground mt-1">{messages.length} total · {unreadCount} unread</p>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">{[1,2,3].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>
        ) : !messages.length ? (
          <div className="border border-dashed border-border rounded-xl py-16 text-center">
            <MessageSquare className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No messages yet. They appear here when someone fills in the contact form.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {messages.map((msg) => {
              const open = expanded === msg.id;
              return (
                <div key={msg.id} className={`bg-card border border-border rounded-xl overflow-hidden ${msg.status === "unread" ? "border-primary/30" : ""}`}>
                  <div className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-muted/10" onClick={() => openMessage(msg.id)}>
                    {msg.status === "unread" && <span className="w-2 h-2 rounded-full bg-primary shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{msg.name || "Anonymous"}</p>
                        {msg.subject && <span className="text-xs text-muted-foreground">· {msg.subject}</span>}
                      </div>
                      <p className="text-xs text-muted-foreground">{msg.email}</p>
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[msg.status] || "bg-muted text-muted-foreground"}`}>{msg.status}</span>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">{timeAgo(msg.created_at)}</span>
                    {open ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
                  </div>

                  {open && (
                    <div className="border-t border-border px-5 py-4 space-y-4">
                      <div className="bg-muted/30 rounded-lg p-3 text-sm">{msg.body}</div>
                      <div className="flex items-start gap-4 flex-wrap">
                        <div className="space-y-1.5">
                          <p className="text-xs text-muted-foreground">Status</p>
                          <Select value={msg.status} onValueChange={(v) => updateMessage(msg.id, { status: v })}>
                            <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {["unread","read","archived"].map((s) => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex-1 min-w-48 space-y-1.5">
                          <p className="text-xs text-muted-foreground">Admin notes</p>
                          <div className="flex gap-2">
                            <Textarea rows={2} className="text-xs"
                              value={notesDraft[msg.id] ?? msg.admin_notes ?? ""}
                              onChange={(e) => setNotesDraft((p) => ({ ...p, [msg.id]: e.target.value }))}
                              placeholder="Add notes…"
                            />
                            <Button size="sm" variant="outline" className="self-end h-8 text-xs" onClick={() => saveNotes(msg)}>Save</Button>
                          </div>
                        </div>
                        <Button size="icon" variant="ghost" className="w-7 h-7 text-destructive hover:text-destructive self-end" onClick={() => handleDelete(msg.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
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
