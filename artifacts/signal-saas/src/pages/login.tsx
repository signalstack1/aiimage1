import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { TVCLogo } from "@/components/TVCLogo";
import { useAuth } from "@/hooks/useAuth";
import { APP_CONFIG } from "@/config/app";

type View = "login" | "forgot";

export default function LoginPage() {
  const [view, setView]         = useState<View>("login");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState<string | null>(null);
  const [loading, setLoading]   = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const { signIn, sendPasswordReset, user } = useAuth();
  const [, navigate]            = useLocation();

  const sessionExpired = new URLSearchParams(window.location.search).get("expired") === "1";

  if (user) {
    navigate("/dashboard");
    return null;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) { setError("Email and password are required."); return; }
    setLoading(true);
    setError(null);
    const { error: authErr } = await signIn(email.trim(), password);
    setLoading(false);
    if (authErr) { setError(authErr); return; }
    navigate("/dashboard");
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { setError("Please enter your email address."); return; }
    setLoading(true);
    setError(null);
    const { error: authErr } = await sendPasswordReset(email.trim());
    setLoading(false);
    if (authErr) { setError(authErr); return; }
    setResetSent(true);
  };

  const switchToForgot = () => {
    setError(null);
    setPassword("");
    setResetSent(false);
    setView("forgot");
  };

  const switchToLogin = () => {
    setError(null);
    setResetSent(false);
    setView("login");
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <Link href="/" className="flex justify-center mb-8">
          <TVCLogo size={117} tagline />
        </Link>

        {/* Session expired banner */}
        {sessionExpired && view === "login" && (
          <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm rounded-xl px-4 py-3 mb-5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>Your session expired. Please sign in again to continue.</span>
          </div>
        )}

        <div className="bg-card border border-border rounded-2xl p-8">
          {view === "login" ? (
            <>
              <h1 className="text-2xl font-extrabold mb-1">Member login</h1>
              <p className="text-sm text-muted-foreground mb-6">Sign in to your TVC member dashboard.</p>

              {error && (
                <div className="bg-destructive/10 border border-destructive/30 text-destructive text-sm rounded-lg px-4 py-3 mb-5">
                  {error}
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4">
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
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <button
                      type="button"
                      onClick={switchToForgot}
                      className="text-xs text-primary hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>
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
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={switchToLogin}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-5 -mt-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to sign in
              </button>

              <h1 className="text-2xl font-extrabold mb-1">Reset password</h1>
              <p className="text-sm text-muted-foreground mb-6">
                Enter your email and we'll send you a link to set a new password.
              </p>

              {error && (
                <div className="bg-destructive/10 border border-destructive/30 text-destructive text-sm rounded-lg px-4 py-3 mb-5">
                  {error}
                </div>
              )}

              {resetSent ? (
                <div className="bg-green-500/10 border border-green-500/30 text-green-400 text-sm rounded-lg px-4 py-4 text-center">
                  <p className="font-semibold mb-1">Check your inbox</p>
                  <p>A password reset link has been sent to <span className="font-medium">{email}</span>. It may take a minute to arrive.</p>
                </div>
              ) : (
                <form onSubmit={handleForgot} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="reset-email">Email address</Label>
                    <Input
                      id="reset-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.co.uk"
                      autoComplete="email"
                      required
                    />
                  </div>
                  <Button type="submit" disabled={loading} className="w-full gradient-brand text-white border-0 hover:opacity-90 font-semibold h-11">
                    {loading ? "Sending…" : "Send reset link"}
                  </Button>
                </form>
              )}
            </>
          )}
        </div>

        {view === "login" && (
          <>
            <p className="text-center text-sm text-muted-foreground mt-5">
              Not a member yet?{" "}
              <Link href="/join" className="text-primary hover:underline font-medium">Apply for TVC membership</Link>
            </p>
            <p className="text-center text-sm text-muted-foreground mt-2">
              Already applied and need an account?{" "}
              <Link href="/signup" className="text-primary hover:underline font-medium">Create account</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
