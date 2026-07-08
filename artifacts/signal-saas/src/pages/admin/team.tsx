import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Shield, UserPlus } from "lucide-react";

export default function AdminTeamPage() {
  return (
    <AdminLayout>
      <div className="p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Admin Team</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage additional admin accounts with separate credentials.</p>
          </div>
          <Button disabled className="gap-2 opacity-50">
            <UserPlus className="w-4 h-4" /> Invite member
          </Button>
        </div>

        <div className="border border-dashed border-border rounded-xl py-20 text-center max-w-md mx-auto">
          <div className="w-12 h-12 rounded-xl bg-muted/50 border border-border flex items-center justify-center mx-auto mb-4">
            <Shield className="w-6 h-6 text-muted-foreground" />
          </div>
          <h3 className="font-semibold mb-2">Admin Team module</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-xs mx-auto">
            Allow multiple people to access the admin panel with individual login credentials. Requires the{" "}
            <code className="bg-muted px-1.5 py-0.5 rounded text-xs">admin_users</code> Supabase table and updated auth logic.
          </p>
          <div className="bg-muted/40 border border-border rounded-lg p-4 text-left text-xs font-mono text-muted-foreground mx-6">
            <span className="text-muted-foreground/50">{"// See CONFIG.md for the schema"}</span>
            <br />
            {"CREATE TABLE admin_users ("}
            <br />
            {"  id UUID PRIMARY KEY,"}
            <br />
            {"  email TEXT UNIQUE,"}
            <br />
            {"  hashed_password TEXT,"}
            <br />
            {"  role TEXT DEFAULT 'admin'"}
            <br />
            {");"}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
