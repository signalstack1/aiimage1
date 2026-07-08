import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { APP_CONFIG } from "@/config/app";

interface Customer {
  id: string;
  email: string;
  plan: string;
  status: string;
  subscribed_at: string;
  expires_at?: string;
}

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const token = sessionStorage.getItem("admin_token") || "";

  // Configurable labels — plural for headings/counts; use products.singular for column header
  const { plural } = APP_CONFIG.admin.customers;
  const productSingular = APP_CONFIG.admin.products.singular;

  useEffect(() => {
    fetch("/api/admin/subscribers", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then(setCustomers)
      .finally(() => setLoading(false));
  }, [token]);

  const filtered = customers.filter(
    (c) =>
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      c.plan.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <AdminLayout>
      <div className="p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">{plural}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {customers.length} total · {customers.filter((c) => c.status === "active").length} active
            </p>
          </div>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={`Search email or ${productSingular.toLowerCase()}…`}
              className="pl-9 text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-5 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : !filtered.length ? (
            <p className="p-8 text-sm text-muted-foreground text-center">
              {search ? `No ${plural.toLowerCase()} match your search.` : `No ${plural.toLowerCase()} yet.`}
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/20">
                <tr>
                  <th className="text-left px-5 py-3 text-xs text-muted-foreground font-medium">Email</th>
                  <th className="text-left px-5 py-3 text-xs text-muted-foreground font-medium">{productSingular}</th>
                  <th className="text-left px-5 py-3 text-xs text-muted-foreground font-medium">Joined</th>
                  <th className="text-left px-5 py-3 text-xs text-muted-foreground font-medium">Expires</th>
                  <th className="text-left px-5 py-3 text-xs text-muted-foreground font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-accent/20 transition-colors">
                    <td className="px-5 py-3.5 font-mono text-xs">{c.email}</td>
                    <td className="px-5 py-3.5">{c.plan}</td>
                    <td className="px-5 py-3.5 text-muted-foreground">{new Date(c.subscribed_at).toLocaleDateString()}</td>
                    <td className="px-5 py-3.5 text-muted-foreground">{c.expires_at ? new Date(c.expires_at).toLocaleDateString() : "—"}</td>
                    <td className="px-5 py-3.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.status === "active" ? "bg-emerald-500/10 text-emerald-400" : "bg-muted text-muted-foreground"}`}>
                        {c.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
