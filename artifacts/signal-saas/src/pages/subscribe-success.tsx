import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, ExternalLink, TrendingUp, MessageCircle } from "lucide-react";
import { SiDiscord, SiTelegram } from "react-icons/si";
import { APP_CONFIG } from "@/config/app";

interface AccessLink {
  id: string;
  platform: string;
  label: string;
  invite_url: string;
}

function PlatformIcon({ platform }: { platform: string }) {
  if (platform === "discord") return <SiDiscord className="w-5 h-5 text-indigo-400" />;
  if (platform === "telegram") return <SiTelegram className="w-5 h-5 text-sky-400" />;
  return <MessageCircle className="w-5 h-5 text-primary" />;
}

export default function SubscribeSuccessPage() {
  const [accessLinks, setAccessLinks] = useState<AccessLink[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/access")
      .then(async (res) => {
        const body = await res.json();
        if (res.ok) setAccessLinks(body.access_links || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-primary/5 rounded-full blur-3xl -z-10" />

      <div className="max-w-md w-full text-center">
        <div className="w-20 h-20 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-10 h-10 text-emerald-400" />
        </div>

        <h1 className="text-3xl font-bold mb-2">{APP_CONFIG.successPage.heading}</h1>
        <p className="text-muted-foreground mb-8">{APP_CONFIG.successPage.subtext}</p>

        {loading ? (
          <div className="bg-card border border-border rounded-xl p-6 mb-6 space-y-3">
            <Skeleton className="h-10 w-10 rounded-lg mx-auto" />
            <Skeleton className="h-4 w-48 mx-auto" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        ) : accessLinks.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-6 mb-6">
            <p className="text-sm text-muted-foreground">
              Your access links are being prepared. Check your email or contact{" "}
              <a href={`mailto:${APP_CONFIG.supportEmail}`} className="text-primary hover:underline">{APP_CONFIG.supportEmail}</a>.
            </p>
          </div>
        ) : (
          <div className="space-y-3 mb-6">
            {accessLinks.map((link) => (
              <div key={link.id} className="bg-card border border-border rounded-xl p-5" data-testid={`card-access-${link.id}`}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-card border border-border flex items-center justify-center">
                    <PlatformIcon platform={link.platform} />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-sm">{link.label}</p>
                    <p className="text-xs text-muted-foreground capitalize">{link.platform} · Private channel</p>
                  </div>
                </div>
                <a href={link.invite_url} target="_blank" rel="noopener noreferrer" data-testid="link-access">
                  <Button className="w-full gradient-brand text-white border-0 hover:opacity-90 gap-2" size="lg">
                    <MessageCircle className="w-4 h-4" />
                    Join {link.platform === "discord" ? "Discord" : link.platform === "telegram" ? "Telegram" : link.label}
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </a>
              </div>
            ))}
          </div>
        )}

        <div className="bg-card/50 border border-border/50 rounded-lg p-4 mb-6 text-left">
          <p className="text-xs text-muted-foreground">
            <span className="text-foreground font-medium">Bookmark this page</span> — your invite links are here if you ever need them again. Questions? Email{" "}
            <a href={`mailto:${APP_CONFIG.supportEmail}`} className="text-primary hover:underline">{APP_CONFIG.supportEmail}</a>.
          </p>
        </div>

        <div className="flex items-center justify-center gap-4">
          <Link href="/">
            <Button variant="outline" size="sm">Back to home</Button>
          </Link>
        </div>

        <div className="mt-8 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <TrendingUp className="w-3 h-3 text-primary" />
          Powered by {APP_CONFIG.appName}
        </div>
      </div>
    </div>
  );
}
