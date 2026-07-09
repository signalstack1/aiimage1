import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import type { Session, User } from "@supabase/supabase-js";

const BASE_URL = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface MemberBusiness {
  id: string;
  via_number: string | null;
  business_name: string;
  trade_type: string;
  location: string;
  website: string | null;
  contact_phone: string | null;
  contact_enabled: boolean;
  description: string | null;
  logo_url: string | null;
  referral_code: string | null;
}

export interface MemberApplication {
  id: string;
  status: "pending" | "in_review" | "approved" | "rejected" | "expired";
  priority: boolean;
  created_at: string;
  updated_at: string;
}

export interface MemberMe {
  business: MemberBusiness;
  application: MemberApplication | null;
}

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  member: MemberMe | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshMember: () => Promise<void>;
}

// ── Context ───────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]       = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [member, setMember]   = useState<MemberMe | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMember = async (accessToken: string): Promise<MemberMe | null> => {
    try {
      const res = await fetch(`${BASE_URL}/api/member/me`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  };

  const refreshMember = async () => {
    if (!session?.access_token) return;
    const data = await fetchMember(session.access_token);
    setMember(data);
  };

  useEffect(() => {
    // Initialise from current session
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.access_token) {
        const m = await fetchMember(data.session.access_token);
        setMember(m);
      }
      setLoading(false);
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (newSession?.access_token) {
        const m = await fetchMember(newSession.access_token);
        setMember(m);
      } else {
        setMember(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setMember(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, member, loading, signIn, signUp, signOut, refreshMember }}>
      {children}
    </AuthContext.Provider>
  );
}
