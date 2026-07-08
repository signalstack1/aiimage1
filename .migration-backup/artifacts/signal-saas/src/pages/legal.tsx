import { Link } from "wouter";
import { ArrowLeft, TrendingUp } from "lucide-react";
import { APP_CONFIG } from "@/config/app";

function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-6 py-16">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-7 h-7 rounded gradient-brand flex items-center justify-center">
            <TrendingUp className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-bold">{APP_CONFIG.appName}</span>
          <span className="text-muted-foreground mx-2">/</span>
          <Link href="/">
            <a className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" /> Home
            </a>
          </Link>
        </div>
        <h1 className="text-3xl font-extrabold mb-8">{title}</h1>
        <div className="prose prose-invert prose-sm max-w-none text-muted-foreground space-y-5">
          {children}
        </div>
      </div>
    </div>
  );
}

export function DisclaimerPage() {
  return (
    <LegalPage title="Risk Disclaimer">
      {APP_CONFIG.disclaimerParagraphs.map((p, i) => (
        <p key={i}>{p}</p>
      ))}
    </LegalPage>
  );
}

export function TermsPage() {
  return (
    <LegalPage title="Terms of Service">
      <p>By subscribing to {APP_CONFIG.legalName}, you agree to these terms of service.</p>
      <h2 className="text-foreground font-semibold mt-6">Subscriptions</h2>
      <p>Monthly subscriptions are billed in advance and renew automatically. You may cancel at any time; access continues until the end of your billing period. Lifetime plans are a one-time payment with no renewal.</p>
      <h2 className="text-foreground font-semibold mt-6">Refund Policy</h2>
      <p>Due to the digital nature of this product, we do not offer refunds once access has been granted. If you experience technical issues preventing access, contact us at <a href={`mailto:${APP_CONFIG.supportEmail}`} className="text-primary hover:underline">{APP_CONFIG.supportEmail}</a> within 48 hours of purchase.</p>
      <h2 className="text-foreground font-semibold mt-6">Prohibited Use</h2>
      <p>You may not share, redistribute, or resell access to our content or channels. Violation may result in immediate cancellation without refund.</p>
      {APP_CONFIG.termsExtraSections.map(({ heading, body }) => (
        <div key={heading}>
          <h2 className="text-foreground font-semibold mt-6">{heading}</h2>
          <p>{body}</p>
        </div>
      ))}
    </LegalPage>
  );
}

export function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy">
      <p>We collect only the information necessary to process your subscription and deliver our service.</p>
      <h2 className="text-foreground font-semibold mt-6">Information We Collect</h2>
      <p>When you subscribe, your payment is processed securely — we never see or store your card details. We receive your email address to manage your subscription and provide access to our channels.</p>
      <h2 className="text-foreground font-semibold mt-6">How We Use It</h2>
      <p>Your email is used only to manage your subscription and send important account notifications. We do not sell, rent, or share your personal information with third parties for marketing purposes.</p>
      <h2 className="text-foreground font-semibold mt-6">Data Retention</h2>
      <p>We retain subscription records as required for accounting and legal compliance. You may request deletion of your data by contacting us at <a href={`mailto:${APP_CONFIG.supportEmail}`} className="text-primary hover:underline">{APP_CONFIG.supportEmail}</a>.</p>
      <h2 className="text-foreground font-semibold mt-6">Cookies</h2>
      <p>This site uses no tracking cookies. Payment processors may set cookies per their own privacy policies.</p>
    </LegalPage>
  );
}
