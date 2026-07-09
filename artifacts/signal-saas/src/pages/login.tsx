import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck, AlertCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { APP_CONFIG } from "@/config/app";

export default function LoginPage() {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState<string | null>(null);
  const [loading, setLoading]   = useState(false);
  const { signIn, user }        = useAuth();
  const [, navigate]            = useLocation();

  const sessionExpired = new URLSearchParams(window.location.search).get("expired") === "1";

  // Already logged in → redirect
  if (user) {
    navigate("/dashboard");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) { setError("Email and password are required."); return; }
    setLoading(true);
    setError(null);
    const { error: authErr } = await signIn(email.trim(), password);
    setLoading(false);
    if (authErr) { setError(authErr); return; }
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 justify-center mb-8">
          <img src="/tvc_logo.png" alt="TVC Secured" className="w-9 h-9 rounded-xl object-cover" />
          <span className="font-bold text-xl tracking-tight">{APP_CONFIG.appName}</span>
        </Link>

        {/* Session expired banner */}
        {sessionExpired && (
          <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm rounded-xl px-4 py-3 mb-5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>Your session expired. Please sign in again to continue.</span>
          </div>
        )}

        <div className="bg-card border border-border rounded-2xl p-8">
          <h1 className="text-2xl font-extrabold mb-1">Member login</h1>
          <p className="text-sm text-muted-foreground mb-6">Sign in to your TVC member dashboard.</p>

          {error && (
            <div className="bg-destructive/10 border border-destructive/30 text-destructive text-sm rounded-lg px-4 py-3 mb-5">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.co.uk"
                autoComplete="email"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
            </div>

            <Button type="submit" disabled={loading} className="w-full gradient-brand text-white border-0 hover:opacity-90 font-semibold h-11">
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-5">
          Not a member yet?{" "}
          <Link href="/join" className="text-primary hover:underline font-medium">Apply for TVC membership</Link>
        </p>
        <p className="text-center text-sm text-muted-foreground mt-2">
          Already applied and need an account?{" "}
          <Link href="/signup" className="text-primary hover:underline font-medium">Create account</Link>
        </p>
      </div>
    </div>
  );
}
