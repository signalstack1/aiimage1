import { AdminLayout } from "@/components/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Info, Lock, Code2 } from "lucide-react";
import { APP_CONFIG } from "@/config/app";

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <p className="font-semibold text-sm">{title}</p>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between py-2.5 border-b border-border last:border-0">
      <span className="text-xs text-muted-foreground w-36 shrink-0">{label}</span>
      <span className="text-sm font-medium text-right flex-1 break-all">{value || "—"}</span>
    </div>
  );
}

const MODULE_META: Record<string, string> = {
  overview:  "Dashboard overview and KPI cards",
  products:  "Manage subscription products and pricing",
  customers: "View and search customer records",
  access:    "Manage Discord/Telegram invite links",
  analytics: "Product views, clicks, and conversion data",
  content:   "Posts and announcements for subscribers",
  messages:  "Broadcast messages to customer segments",
  activity:  "Full platform event log",
  team:      "Multi-admin user management",
  settings:  "This settings panel",
};

export default function AdminSettingsPage() {
  const modules = APP_CONFIG.adminModules;
  const admin = APP_CONFIG.admin;

  return (
    <AdminLayout>
      <div className="p-8 space-y-6 max-w-2xl">
        <div>
          <h1 className="text-2xl font-bold mb-0.5">Settings</h1>
          <p className="text-sm text-muted-foreground">
            Configuration is managed via <code className="text-xs bg-muted px-1.5 py-0.5 rounded">src/config/app.ts</code> — not stored in the database.
          </p>
        </div>

        {/* Brand identity */}
        <Section title="Brand Identity" description="Edit src/config/app.ts to change any of these values.">
          <Row label="App name"      value={APP_CONFIG.appName} />
          <Row label="Tagline"       value={APP_CONFIG.tagline} />
          <Row label="Support email" value={APP_CONFIG.supportEmail} />
          <Row label="Legal name"    value={APP_CONFIG.legalName} />
          <Row label="Primary color" value={APP_CONFIG.primaryColor ?? "Default (cyan)"} />
        </Section>

        {/* Admin labels */}
        <Section title="Section Labels" description="Terminology used throughout the admin panel.">
          <Row label="Products (singular / plural)"  value={`${admin.products.singular} / ${admin.products.plural}`} />
          <Row label="Customers (singular / plural)" value={`${admin.customers.singular} / ${admin.customers.plural}`} />
          <Row label="Access (singular / plural)"    value={`${admin.access.singular} / ${admin.access.plural}`} />
        </Section>

        {/* Modules */}
        <Section title="Active Modules" description="Toggle modules in adminModules inside src/config/app.ts. Disabled modules are hidden from navigation and blocked from direct URL access.">
          <div className="space-y-2">
            {Object.entries(modules).map(([key, enabled]) => (
              <div key={key} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div className="flex items-center gap-2.5">
                  {enabled
                    ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    : <XCircle className="w-4 h-4 text-muted-foreground/40 shrink-0" />}
                  <div>
                    <p className={`text-sm font-medium capitalize ${!enabled ? "text-muted-foreground" : ""}`}>{key}</p>
                    <p className="text-xs text-muted-foreground">{MODULE_META[key] ?? ""}</p>
                  </div>
                </div>
                <Badge variant="outline" className={enabled ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/5" : "text-muted-foreground/50"}>
                  {enabled ? "On" : "Off"}
                </Badge>
              </div>
            ))}
          </div>
        </Section>

        {/* Security */}
        <Section title="Admin Security">
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3.5 bg-muted/30 rounded-lg border border-border">
              <Lock className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium">Admin password</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Set via the <code className="bg-muted px-1 rounded text-[11px]">ADMIN_PASSWORD</code> environment variable.
                  Change it in Vercel → Project Settings → Environment Variables, then redeploy.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3.5 bg-muted/30 rounded-lg border border-border">
              <Info className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium">Session token</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Admin sessions are stored in <code className="bg-muted px-1 rounded text-[11px]">sessionStorage</code> and expire after 30 days or when you close the browser tab. No server-side session state is maintained.
                </p>
              </div>
            </div>
          </div>
        </Section>

        {/* How to change */}
        <Section title="How to make changes">
          <div className="flex items-start gap-3 p-3.5 bg-muted/30 rounded-lg border border-border">
            <Code2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium">Config-first architecture</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Edit <code className="bg-muted px-1 rounded text-[11px]">src/config/app.ts</code> to change branding, copy, modules, and admin labels. Push to GitHub to trigger a Vercel redeploy.
              </p>
              <div className="mt-3 bg-background border border-border rounded-lg p-3 font-mono text-[11px] text-muted-foreground leading-relaxed">
                <span className="text-muted-foreground/50">// Enable a disabled module:</span><br />
                adminModules: {"{"} ..., content: <span className="text-emerald-400">true</span> {"}"}
                <br /><br />
                <span className="text-muted-foreground/50">// Rename "Customers" to "Members":</span><br />
                admin: {"{"} ..., customers: {"{"} singular: <span className="text-amber-400">"Member"</span>, plural: <span className="text-amber-400">"Members"</span> {"}"} {"}"}
              </div>
            </div>
          </div>
        </Section>
      </div>
    </AdminLayout>
  );
}
