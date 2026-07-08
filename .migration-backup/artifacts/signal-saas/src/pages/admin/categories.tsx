import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, ChevronDown, ChevronRight, Loader2, Check, X } from "lucide-react";

interface Category {
  id: string;
  name: string;
  parent_id: string | null;
  sort_order: number;
}

export default function AdminCategoriesPage() {
  const { toast } = useToast();
  const token = sessionStorage.getItem("admin_token") || "";
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  const [cats, setCats] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // inline create state
  const [newParentName, setNewParentName] = useState("");
  const [newSubName, setNewSubName] = useState("");
  const [newSubParentId, setNewSubParentId] = useState<string | null>(null);
  const [creatingParent, setCreatingParent] = useState(false);
  const [creatingSub, setCreatingSub] = useState(false);

  // inline edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    fetch("/api/admin/categories", { headers })
      .then((r) => r.json())
      .then(setCats)
      .catch(() => toast({ title: "Failed to load categories", variant: "destructive" }))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const parents = cats.filter((c) => !c.parent_id);
  const childrenOf = (parentId: string) => cats.filter((c) => c.parent_id === parentId);

  const createCategory = async (name: string, parentId: string | null, done: () => void) => {
    if (!name.trim()) return;
    const res = await fetch("/api/admin/categories", { method: "POST", headers, body: JSON.stringify({ name: name.trim(), parent_id: parentId }) });
    if (!res.ok) { toast({ title: "Failed to create category", variant: "destructive" }); return; }
    toast({ title: "Category created" });
    done();
    load();
  };

  const startEdit = (cat: Category) => { setEditingId(cat.id); setEditName(cat.name); };
  const cancelEdit = () => { setEditingId(null); setEditName(""); };

  const saveEdit = async (id: string) => {
    if (!editName.trim()) return;
    setSaving(true);
    const res = await fetch(`/api/admin/categories/${id}`, { method: "PATCH", headers, body: JSON.stringify({ name: editName.trim() }) });
    setSaving(false);
    if (!res.ok) { toast({ title: "Failed to rename", variant: "destructive" }); return; }
    toast({ title: "Category renamed" });
    setEditingId(null);
    load();
  };

  const deleteCategory = async (id: string) => {
    if (!confirm("Delete this category? Products using it will be uncategorised.")) return;
    setDeleting(id);
    const res = await fetch(`/api/admin/categories/${id}`, { method: "DELETE", headers });
    setDeleting(null);
    if (!res.ok) { toast({ title: "Failed to delete", variant: "destructive" }); return; }
    toast({ title: "Category deleted" });
    load();
  };

  const toggleExpand = (id: string) => setExpanded((p) => ({ ...p, [id]: !p[id] }));

  const NameCell = ({ cat }: { cat: Category }) => {
    if (editingId === cat.id) {
      return (
        <div className="flex items-center gap-2 flex-1">
          <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-7 text-sm py-0 max-w-xs" autoFocus onKeyDown={(e) => { if (e.key === "Enter") saveEdit(cat.id); if (e.key === "Escape") cancelEdit(); }} />
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => saveEdit(cat.id)} disabled={saving}>{saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3 text-primary" />}</Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={cancelEdit}><X className="w-3 h-3" /></Button>
        </div>
      );
    }
    return <span className="flex-1 text-sm">{cat.name}</span>;
  };

  return (
    <AdminLayout>
      <div className="p-8 max-w-2xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Categories</h1>
          <p className="text-sm text-muted-foreground mt-1">Organise your products with categories and sub-categories.</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-32"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="space-y-3">
            {parents.length === 0 && (
              <p className="text-sm text-muted-foreground py-6 text-center border border-dashed border-border rounded-xl">No categories yet. Create your first one below.</p>
            )}

            {parents.map((parent) => {
              const children = childrenOf(parent.id);
              const isOpen = expanded[parent.id] ?? true;
              return (
                <div key={parent.id} className="border border-border rounded-xl overflow-hidden">
                  {/* Parent row */}
                  <div className="flex items-center gap-2 px-4 py-3 bg-card/60">
                    <button onClick={() => toggleExpand(parent.id)} className="text-muted-foreground hover:text-foreground">
                      {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                    <NameCell cat={parent} />
                    <div className="flex items-center gap-1 ml-auto">
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => { setNewSubParentId(parent.id); setExpanded((p) => ({ ...p, [parent.id]: true })); }} title="Add sub-category">
                        <Plus className="w-3.5 h-3.5" />
                      </Button>
                      {editingId !== parent.id && (
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => startEdit(parent)}><Pencil className="w-3.5 h-3.5" /></Button>
                      )}
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => deleteCategory(parent.id)} disabled={deleting === parent.id}>
                        {deleting === parent.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                      </Button>
                    </div>
                  </div>

                  {/* Sub-categories */}
                  {isOpen && (
                    <div className="border-t border-border">
                      {children.map((child) => (
                        <div key={child.id} className="flex items-center gap-2 px-4 py-2.5 pl-10 border-b border-border/50 last:border-0 bg-card/20">
                          <span className="text-muted-foreground/40 text-xs mr-1">└</span>
                          <NameCell cat={child} />
                          <div className="flex items-center gap-1 ml-auto">
                            {editingId !== child.id && (
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => startEdit(child)}><Pencil className="w-3.5 h-3.5" /></Button>
                            )}
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => deleteCategory(child.id)} disabled={deleting === child.id}>
                              {deleting === child.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                            </Button>
                          </div>
                        </div>
                      ))}

                      {/* Inline sub-category creation */}
                      {newSubParentId === parent.id ? (
                        <div className="flex items-center gap-2 px-4 py-2.5 pl-10 border-t border-border/50 bg-card/20">
                          <span className="text-muted-foreground/40 text-xs mr-1">└</span>
                          <Input value={newSubName} onChange={(e) => setNewSubName(e.target.value)} placeholder="Sub-category name…" className="h-7 text-sm py-0 max-w-xs" autoFocus onKeyDown={(e) => { if (e.key === "Enter") createCategory(newSubName, parent.id, () => { setNewSubName(""); setNewSubParentId(null); }); if (e.key === "Escape") { setNewSubName(""); setNewSubParentId(null); } }} />
                          <Button size="sm" className="h-7 text-xs" disabled={creatingSub || !newSubName.trim()} onClick={async () => { setCreatingSub(true); await createCategory(newSubName, parent.id, () => { setNewSubName(""); setNewSubParentId(null); }); setCreatingSub(false); }}>
                            {creatingSub ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null} Add
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setNewSubName(""); setNewSubParentId(null); }}>Cancel</Button>
                        </div>
                      ) : (
                        children.length === 0 && (
                          <button onClick={() => setNewSubParentId(parent.id)} className="w-full text-left px-4 py-2 pl-10 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 border-t border-border/50">
                            <Plus className="w-3 h-3" /> Add sub-category
                          </button>
                        )
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* New parent category row */}
            <div className="border border-dashed border-border rounded-xl px-4 py-3">
              <div className="flex items-center gap-2">
                <Input value={newParentName} onChange={(e) => setNewParentName(e.target.value)} placeholder="New category name…" className="h-8 text-sm max-w-xs" onKeyDown={(e) => { if (e.key === "Enter") createCategory(newParentName, null, () => setNewParentName("")); }} />
                <Button size="sm" disabled={creatingParent || !newParentName.trim()} onClick={async () => { setCreatingParent(true); await createCategory(newParentName, null, () => setNewParentName("")); setCreatingParent(false); }}>
                  {creatingParent ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Plus className="w-3.5 h-3.5 mr-1.5" />} Add category
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
