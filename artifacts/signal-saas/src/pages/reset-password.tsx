import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck, CheckCircle2, AlertCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { APP_CONFIG } from "@/config/app";
import { supabase } from "@/lib/supabase";

export default function ResetPasswordPage() {
  const [password, setPassword]     = useState("");
  const [confirm, setConfirm]       = useState("");
  const [error, setError]           = useState<string | null>(null);
  const [loading, setLoading]       = useState(false);
  const [done, setDone]             = useState(false);
  const [tokenReady, setTokenReady] = useState(false);
  const [tokenError, setTokenError] = useState(false);
  const { updatePassword }          = useAuth();
  const [, navigate]                = useLocation();

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash) { setTokenError(true); return; }

    const params      = new URLSearchParams(hash.replace(/^#/, ""));
    const type        = params.get("type");
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");

    if (type === "recovery" && accessToken && refreshToken) {
      supabase.auth
        .setSession({ access_token: accessToken, refresh_token: refreshToken })
        .then(({ error: sessionErr }) => {
          if (sessionErr) setTokenError(true);
          else            setTokenReady(true);
        });
    } else {
      setTokenError(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (password !== confirm) { setError("Passwords do not match."); return; }
    setLoading(true);
    setError(null);
    const { error: authErr } = await updatePassword(password);
    setLoading(false);
    if (authErr) { setError(authErr); return; }
    setDone(true);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 justify-center mb-8">
          <div className="w-9 h-9 rounded-xl gradient-brand flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-xl tracking-tight">{APP_CONFIG.appName}</span>
        </Link>

        <div className="bg-card border border-border rounded-2xl p-8">
          {done ? (
            <div className="text-center">
              <CheckCircle2 className="w-10 h-10 text-green-400 mx-auto mb-4" />
              <h1 className="text-xl font-extrabold mb-2">Password updated</h1>
              <p className="text-sm text-muted-foreground mb-6">
                Your new password has been set. You can now sign in with it.
              </p>
              <Button
                className="w-full gradient-brand text-white border-0 hover:opacity-90 font-semibold h-11"
                onClick={() => navigate("/login")}
              >
                Go to sign in
              </Button>
            </div>
          ) : tokenError ? (
            <div className="text-center">
              <AlertCircle className="w-10 h-10 text-destructive mx-auto mb-4" />
              <h1 className="text-xl font-extrabold mb-2">Invalid or expired link</h1>
              <p className="text-sm text-muted-foreground mb-6">
                This password reset link is no longer valid. Please request a new one from the sign-in page.
              </p>
              <Button
                variant="outline"
                className="w-full h-11 font-semibold"
                onClick={() => navigate("/login")}
              >
                Back to sign in
              </Button>
            </div>
          ) : !tokenReady ? (
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground">Verifying reset link…</p>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-extrabold mb-1">Set new password</h1>
              <p className="text-sm text-muted-foreground mb-6">
                Choose a strong password for your account.
              </p>

              {error && (
                <div className="bg-destructive/10 border border-destructive/30 text-destructive text-sm rounded-lg px-4 py-3 mb-5">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="password">New password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    autoComplete="new-password"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="confirm">Confirm password</Label>
                  <Input
                    id="confirm"
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Repeat your new password"
                    autoComplete="new-password"
                    required
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full gradient-brand text-white border-0 hover:opacity-90 font-semibold h-11"
                >
                  {loading ? "Updating…" : "Update password"}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
