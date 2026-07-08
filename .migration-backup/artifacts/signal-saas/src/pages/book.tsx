import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, CalendarCheck } from "lucide-react";
import { APP_CONFIG } from "@/config/app";

interface Service {
  id: string;
  name: string;
}

const EMPTY = { customer_name: "", email: "", phone: "", service: "", preferred_date: "", preferred_time: "", message: "" };

export default function BookPage() {
  const [form, setForm] = useState(EMPTY);
  const [services, setServices] = useState<Service[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/services")
      .then((r) => r.json())
      .then((data) => setServices(Array.isArray(data) ? data : []))
      .catch(() => setServices([]));
  }, []);

  const set = (key: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customer_name.trim()) { setError("Please enter your name."); return; }
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      setSubmitted(true);
    } catch {
      setError("Something went wrong. Please try again or contact us directly.");
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
          <Link href="/book" className="text-foreground font-medium">Book</Link>
          <Link href="/contact" className="hover:text-foreground transition-colors">Contact</Link>
        </nav>
      </header>

      <main className="max-w-xl mx-auto px-6 py-16">
        {submitted ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl gradient-brand flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold mb-3">Booking received!</h2>
            <p className="text-muted-foreground mb-8">
              Thank you, <strong>{form.customer_name}</strong>. We'll be in touch shortly to confirm your appointment.
            </p>
            <Button variant="outline" onClick={() => { setForm(EMPTY); setSubmitted(false); }}>Submit another</Button>
          </div>
        ) : (
          <>
            <div className="text-center mb-10">
              <div className="w-12 h-12 rounded-xl gradient-brand flex items-center justify-center mx-auto mb-4">
                <CalendarCheck className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-3xl font-bold mb-2">Book an appointment</h1>
              <p className="text-muted-foreground">Fill in your details and we'll confirm your booking.</p>
            </div>

            <form onSubmit={handleSubmit} className="bg-card border border-border rounded-2xl p-6 space-y-4">
              <div className="space-y-1.5">
                <Label>Your name *</Label>
                <Input value={form.customer_name} onChange={set("customer_name")} placeholder="Jane Smith" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input type="email" value={form.email} onChange={set("email")} placeholder="jane@example.com" />
                </div>
                <div className="space-y-1.5">
                  <Label>Phone</Label>
                  <Input value={form.phone} onChange={set("phone")} placeholder="+44 7700 000000" />
                </div>
              </div>

              {services.length > 0 && (
                <div className="space-y-1.5">
                  <Label>Service</Label>
                  <Select value={form.service} onValueChange={(v) => setForm((f) => ({ ...f, service: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select a service…" /></SelectTrigger>
                    <SelectContent>
                      {services.map((s) => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
                      <SelectItem value="other">Other / Not sure</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {services.length === 0 && (
                <div className="space-y-1.5">
                  <Label>Service needed</Label>
                  <Input value={form.service} onChange={set("service")} placeholder="What can we help you with?" />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Preferred date</Label>
                  <Input type="date" value={form.preferred_date} onChange={set("preferred_date")} />
                </div>
                <div className="space-y-1.5">
                  <Label>Preferred time</Label>
                  <Input type="time" value={form.preferred_time} onChange={set("preferred_time")} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Additional notes</Label>
                <Textarea value={form.message} onChange={set("message")} rows={3} placeholder="Anything else we should know?" />
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <Button type="submit" disabled={submitting} className="w-full gradient-brand text-white glow-primary-sm">
                {submitting ? "Submitting…" : "Request booking"}
              </Button>
            </form>
          </>
        )}
      </main>

      <footer className="border-t border-border mt-8 py-8 text-center text-sm text-muted-foreground">
        <p>© {new Date().getFullYear()} {APP_CONFIG.appName}</p>
      </footer>
    </div>
  );
}
