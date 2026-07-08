import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, Mail, Phone, MapPin } from "lucide-react";
import { APP_CONFIG } from "@/config/app";

const EMPTY = { name: "", email: "", subject: "", body: "" };

export default function ContactPage() {
  const [form, setForm] = useState(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const set = (key: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email.trim() || !form.body.trim()) { setError("Email and message are required."); return; }
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      setSubmitted(true);
    } catch {
      setError("Something went wrong. Please try again or email us directly.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card/40 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="font-bold text-lg tracking-tight">{APP_CONFIG.appName}</Link>
        <nav className="flex items-center gap-6 text-sm text-muted-foreground">
          <Link href="/services" className="hover:text-foreground transition-colors">Services</Link>
          <Link href="/gallery" className="hover:text-foreground transition-colors">Gallery</Link>
          <Link href="/contact" className="text-foreground font-medium">Contact</Link>
        </nav>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-3">Get in touch</h1>
          <p className="text-muted-foreground text-lg">We'd love to hear from you.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-10">
          <div className="md:col-span-2 space-y-6">
            {APP_CONFIG.supportEmail && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Mail className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">Email</p>
                  <a href={`mailto:${APP_CONFIG.supportEmail}`} className="text-sm text-muted-foreground hover:text-foreground transition-colors break-all">{APP_CONFIG.supportEmail}</a>
                </div>
              </div>
            )}
            <div className="flex items-start gap-3 text-sm text-muted-foreground">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <Phone className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Phone</p>
                <p>Contact us via the form and we'll get back to you.</p>
              </div>
            </div>
          </div>

          <div className="md:col-span-3">
            {submitted ? (
              <div className="text-center py-12">
                <div className="w-14 h-14 rounded-2xl gradient-brand flex items-center justify-center mx-auto mb-5">
                  <CheckCircle2 className="w-7 h-7 text-white" />
                </div>
                <h2 className="text-xl font-bold mb-2">Message sent!</h2>
                <p className="text-muted-foreground mb-6">Thanks for reaching out. We'll reply to <strong>{form.email}</strong> as soon as possible.</p>
                <Button variant="outline" onClick={() => { setForm(EMPTY); setSubmitted(false); }}>Send another</Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="bg-card border border-border rounded-2xl p-6 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Name</Label>
                    <Input value={form.name} onChange={set("name")} placeholder="Jane Smith" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Email *</Label>
                    <Input type="email" value={form.email} onChange={set("email")} placeholder="jane@example.com" required />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Subject</Label>
                  <Input value={form.subject} onChange={set("subject")} placeholder="How can we help?" />
                </div>
                <div className="space-y-1.5">
                  <Label>Message *</Label>
                  <Textarea value={form.body} onChange={set("body")} rows={5} placeholder="Tell us about your project…" required />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button type="submit" disabled={submitting} className="w-full gradient-brand text-white glow-primary-sm">
                  {submitting ? "Sending…" : "Send message"}
                </Button>
              </form>
            )}
          </div>
        </div>
      </main>

      <footer className="border-t border-border mt-16 py-8 text-center text-sm text-muted-foreground">
        <p>© {new Date().getFullYear()} {APP_CONFIG.appName}</p>
      </footer>
    </div>
  );
}
