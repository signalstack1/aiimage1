import { Redirect } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { ShieldCheck } from "lucide-react";

/**
 * Protects dashboard routes.
 * Shows a loading spinner while auth state resolves.
 * Redirects to /login if not authenticated.
 */
export function MemberRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-sm text-muted-foreground">Loading your dashboard…</p>
        </div>
      </div>
    );
  }

  if (!user) return <Redirect to="/login" />;
  return <>{children}</>;
}
