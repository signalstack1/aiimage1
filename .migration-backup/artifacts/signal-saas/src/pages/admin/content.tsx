import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { FileText, Plus } from "lucide-react";

export default function AdminContentPage() {
  return (
    <AdminLayout>
      <div className="p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Content</h1>
            <p className="text-sm text-muted-foreground mt-1">Publish posts and announcements for your subscribers.</p>
          </div>
          <Button disabled className="gap-2 opacity-50">
            <Plus className="w-4 h-4" /> New post
          </Button>
        </div>

        <div className="border border-dashed border-border rounded-xl py-20 text-center max-w-md mx-auto">
          <div className="w-12 h-12 rounded-xl bg-muted/50 border border-border flex items-center justify-center mx-auto mb-4">
            <FileText className="w-6 h-6 text-muted-foreground" />
          </div>
          <h3 className="font-semibold mb-2">Content module</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-xs mx-auto">
            Create posts and announcements visible to your subscribers. Requires the{" "}
            <code className="bg-muted px-1.5 py-0.5 rounded text-xs">content_posts</code> Supabase table.
          </p>
          <div className="bg-muted/40 border border-border rounded-lg p-4 text-left text-xs font-mono text-muted-foreground mx-6">
            <span className="text-muted-foreground/50">{"// See CONFIG.md for the schema"}</span>
            <br />
            {"CREATE TABLE content_posts ("}
            <br />
            {"  id UUID PRIMARY KEY,"}
            <br />
            {"  title TEXT, body TEXT,"}
            <br />
            {"  published_at TIMESTAMPTZ"}
            <br />
            {");"}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
