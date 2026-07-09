import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Search, ChevronRight, ShieldCheck } from "lucide-react";

const BASE_URL = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

const STATUS_TABS = [
  { value: "all",      label: "All" },
  { value: "approved", label: "Approved" },
  { value: "in_review",label: "In Review" },
  { value: "pending",  label: "Pending" },
  { value: "rejected", label: "Rejected" },
];

const STATUS_STYLE: Record<string, string> = {
  approved:  "bg-emerald-500/15 text-emerald-400",
  in_review: "bg-amber-500/15 text-amber-400",
  pending:   "bg-sky-500/15 text-sky-400",
  rejected:  "bg-red-500/15 text-red-400",
  expired:   "bg-muted text-muted-foreground",
};

interface Member {
  id: string;
  business_name: string;
  trade_type: string;
  location: string;
  via_number: string | null;
  user_id: string | null;
  applications: { id: string; status: string; updated_at: string }[];
}

export default function AdminMembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const token = sessionStorage.getItem("admin_token") || "";
  const headers = { Authorization: `Bearer ${token}` };

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (search.trim()) params.set("search", search.trim());
    fetch(`${BASE_URL}/api/admin/members?${params}`, { headers })
      .then((r) => r.json())
      .then((d) => setMembers(Array.isArray(d) ? d : []))
      .catch(() => setMembers([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [statusFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    load();
  };

  return (
    <AdminLayout>
      <div className="p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Users className="w-6 h-6" /> Members
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              All businesses with TVC applications, searchable and filterable.
            </p>
          </div>
        </div>

        {/* Search + status tabs */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <form onSubmit={handleSearch} className="flex gap-2 flex-1">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, TVC number or location…"
                className="pl-9"
              />
            </div>
            <button type="submit" className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90">
              Search
            </button>
          </form>
        </div>

        <div className="flex items-center gap-1 mb-4 overflow-x-auto pb-1">
          {STATUS_TABS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setStatusFilter(value)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                statusFilter === value ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1,2,3,4].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
          </div>
        ) : members.length === 0 ? (
          <div className="border border-dashed border-border rounded-xl py-16 text-center">
            <Users className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No members found.</p>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/20">
                  <th className="text-left px-5 py-3 text-xs text-muted-foreground font-medium">Business</th>
                  <th className="text-left px-4 py-3 text-xs text-muted-foreground font-medium hidden sm:table-cell">Trade</th>
                  <th className="text-left px-4 py-3 text-xs text-muted-foreground font-medium hidden md:table-cell">Location</th>
                  <th className="text-left px-4 py-3 text-xs text-muted-foreground font-medium hidden md:table-cell">Auth</th>
                  <th className="text-center px-4 py-3 text-xs text-muted-foreground font-medium">Status</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {members.map((m) => {
                  const appStatus = m.applications?.[0]?.status ?? "pending";
                  const statusCls = STATUS_STYLE[appStatus] ?? STATUS_STYLE.expired;
                  return (
                    <tr
                      key={m.id}
                      className="hover:bg-accent/20 transition-colors cursor-pointer"
                      onClick={() => { window.location.href = `${BASE_URL}/admin/members/${m.id}`; }}
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          {m.via_number ? (
                            <div className="w-8 h-8 rounded-lg gradient-brand flex items-center justify-center shrink-0">
                              <ShieldCheck className="w-4 h-4 text-white" />
                            </div>
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                              <ShieldCheck className="w-4 h-4 text-muted-foreground" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium">{m.business_name}</p>
                            {m.via_number && (
                              <p className="text-xs text-primary font-mono">{m.via_number}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-muted-foreground hidden sm:table-cell">{m.trade_type}</td>
                      <td className="px-4 py-3.5 text-muted-foreground hidden md:table-cell">{m.location}</td>
                      <td className="px-4 py-3.5 hidden md:table-cell">
                        <span className={`text-[10px] font-medium ${m.user_id ? "text-emerald-400" : "text-amber-400"}`}>
                          {m.user_id ? "✓ Linked" : "Not linked"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${statusCls}`}>
                          {appStatus.replace("_", " ")}
                        </span>
                      </td>
                      <td className="pr-4">
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
