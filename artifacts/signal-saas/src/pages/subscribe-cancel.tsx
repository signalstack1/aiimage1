import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { XCircle, TrendingUp } from "lucide-react";
import { APP_CONFIG } from "@/config/app";

export default function SubscribeCancelPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
          <XCircle className="w-10 h-10 text-muted-foreground" />
        </div>
        <h1 className="text-3xl font-bold mb-2">Payment cancelled</h1>
        <p className="text-muted-foreground mb-8">
          No worries — you haven't been charged. Come back whenever you're ready.
        </p>
        <Link href="/#pricing">
          <Button className="gradient-brand text-white border-0 hover:opacity-90 font-semibold" size="lg">
            View plans again
          </Button>
        </Link>
        <div className="mt-8 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <TrendingUp className="w-3 h-3 text-primary" />
          Powered by {APP_CONFIG.appName}
        </div>
      </div>
    </div>
  );
}
