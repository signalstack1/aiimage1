import { useEffect, useState } from "react";
import { Link } from "wouter";
import { AdminLayout } from "@/components/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ClipboardList, ChevronRight, Star } from "lucide-react";

const BASE_URL = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

const STATUS_TABS = [
  { value: "all",       label: "All" },
  { value: "pending",   label: "Pending" },
  { value: "in_review", label: "In Review" },
  { value: "approved",  label: "Approved" },
  { value: "rejected",  label: "Rejected" },
  { value: "expired",   label: "Expired" },
];

const STATUS_STYLE: Record<string, string> = {
  pending:   "bg-sky-500/15 text-sky-400 border-sky-500/30",
  in_review: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  approved:  "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  rejected:  "bg-red-500/15 text-red-400 border-red-500/30",
  expired:   "bg-muted text-muted-foreground border-border",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending", in_review: "In Review", approved: "Approved",
  rejected: "Rejected", expired: "Expired",
};

interface Application {
  id: string;
  status: string;
  priority: boolean;
  applicant_name: string;
  applicant_email: string;
  created_at: string;
  updated_at: string;
  businesses: {
    business_name: string;
    trade_type: string;
    location: string;
    via_number: string | null;
  } | null;
}

function timeAgo(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (d < 1) return "today";
  if (d === 1) return "yesterday";
  return `${d}d ago`;
}

export default function AdminApplicationsPage() {
  const [apps, setApps]     = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const token = sessionStorage.getItem("admin_token") || "";
  const headers = { Authorization: `Bearer ${token}` };

  const load = (s: string) => {
    setLoading(true);
    const qs = s !== "all" ? `?status=${s}` : "";
    fetch(`${BASE_URL}/api/admin/applications${qs}`, { headers })
      .then((r) => r.json())
      .then((d) => setApps(Array.isArray(d) ? d : []))
      .catch(() => setApps([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(statusFilter); }, [statusFilter]);

  const counts: Record<string, number> = {};
  apps.forEach((a) => { counts[a.status] = (counts[a.status] ?? 0) + 1; });

  return (
    <AdminLayout>
      <div className="p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ClipboardList className="w-6 h-6" /> Applications
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Review and manage VIA membership applications.
            </p>
          </div>
        </div>

        {/* Status filter tabs */}
        <div className="flex items-center gap-1 mb-5 overflow-x-auto pb-1">
          {STATUS_TABS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setStatusFilter(value)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                statusFilter === value
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Table */}
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
          </div>
        ) : apps.length === 0 ? (
          <div className="border border-dashed border-border rounded-xl py-16 text-center">
            <ClipboardList className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No applications found.</p>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/20">
                  <th className="text-left px-5 py-3 text-xs text-muted-foreground font-medium">Business</th>
                  <th className="text-left px-4 py-3 text-xs text-muted-foreground font-medium hidden md:table-cell">Trade</th>
                  <th className="text-left px-4 py-3 text-xs text-muted-foreground font-medium hidden lg:table-cell">Location</th>
                  <th className="text-left px-4 py-3 text-xs text-muted-foreground font-medium hidden lg:table-cell">Applicant</th>
                  <th className="text-left px-4 py-3 text-xs text-muted-foreground font-medium hidden md:table-cell">Submitted</th>
                  <th className="text-center px-4 py-3 text-xs text-muted-foreground font-medium">Status</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {apps.map((app) => {
                  const biz = app.businesses;
                  const statusCls = STATUS_STYLE[app.status] ?? STATUS_STYLE.expired;
                  return (
                    <tr
                      key={app.id}
                      className="hover:bg-accent/20 transition-colors cursor-pointer"
                      onClick={() => { window.location.href = `${BASE_URL}/admin/applications/${app.id}`; }}
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <div>
                            <p className="font-medium">{biz?.business_name ?? "—"}</p>
                            {biz?.via_number && (
                              <p className="text-xs text-primary font-mono">{biz.via_number}</p>
                            )}
                          </div>
                          {app.priority && (
                            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0" aria-label="Priority" />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-muted-foreground hidden md:table-cell">{biz?.trade_type ?? "—"}</td>
                      <td className="px-4 py-3.5 text-muted-foreground hidden lg:table-cell">{biz?.location ?? "—"}</td>
                      <td className="px-4 py-3.5 hidden lg:table-cell">
                        <div>
                          <p className="text-xs">{app.applicant_name}</p>
                          <p className="text-xs text-muted-foreground">{app.applicant_email}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-muted-foreground hidden md:table-cell">{timeAgo(app.created_at)}</td>
                      <td className="px-4 py-3.5 text-center">
                        <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${statusCls}`}>
                          {STATUS_LABELS[app.status] ?? app.status}
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
