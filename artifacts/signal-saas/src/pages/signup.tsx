import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { TVCLogo } from "@/components/TVCLogo";
import { useAuth } from "@/hooks/useAuth";
import { ArrowRight, ShieldCheck } from "lucide-react";

export default function SignupPage() {
  const { user }     = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (user) navigate("/dashboard");
  }, [user]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm text-center">
        <Link href="/" className="flex justify-center mb-8">
          <TVCLogo size={117} tagline />
        </Link>

        <div className="bg-card border border-border rounded-2xl p-8">
          <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-xl font-extrabold mb-2">Application required</h1>
          <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
            To create a TVC Approved account, please complete the application and payment flow. Your account is created as part of the process.
          </p>
          <Button className="w-full gradient-brand text-white border-0 hover:opacity-90 font-semibold h-11" asChild>
            <Link href="/join">
              Start application <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-5">
          Already applied?{" "}
          <Link href="/login" className="text-primary hover:underline font-medium">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
