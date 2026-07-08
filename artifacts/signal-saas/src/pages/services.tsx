import { useEffect, useState } from "react";
import { Link } from "wouter";
import { APP_CONFIG } from "@/config/app";

interface Service {
  id: string;
  name: string;
  description: string;
  image_url: string;
  category: string;
  starting_price: string;
  cta_type: string;
  is_active: boolean;
  is_featured: boolean;
}

const CTA_LABELS: Record<string, string> = { book: "Book Now", quote: "Request Quote", call: "Call Now", whatsapp: "WhatsApp" };
const CTA_LINKS: Record<string, string> = { book: "/book", quote: "/contact", call: "#", whatsapp: "#" };

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>("all");

  useEffect(() => {
    fetch("/api/services")
      .then((r) => r.json())
      .then(setServices)
      .catch(() => setServices([]))
      .finally(() => setLoading(false));
  }, []);

  const categories = ["all", ...Array.from(new Set(services.map((s) => s.category).filter(Boolean)))];
  const filtered = activeCategory === "all" ? services : services.filter((s) => s.category === activeCategory);
  const featured = services.filter((s) => s.is_featured);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card/40 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="font-bold text-lg tracking-tight">{APP_CONFIG.appName}</Link>
        <nav className="flex items-center gap-6 text-sm text-muted-foreground">
          <Link href="/services" className="text-foreground font-medium">Services</Link>
          <Link href="/gallery" className="hover:text-foreground transition-colors">Gallery</Link>
          <Link href="/contact" className="hover:text-foreground transition-colors">Contact</Link>
        </nav>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-3">Our Services</h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Professional services tailored to your needs.
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1,2,3,4,5,6].map((i) => (
              <div key={i} className="bg-card border border-border rounded-2xl overflow-hidden animate-pulse">
                <div className="aspect-video bg-muted" />
                <div className="p-5 space-y-2">
                  <div className="h-4 bg-muted rounded w-2/3" />
                  <div className="h-3 bg-muted rounded w-full" />
                  <div className="h-3 bg-muted rounded w-4/5" />
                </div>
              </div>
            ))}
          </div>
        ) : !services.length ? (
          <p className="text-center text-muted-foreground py-16">No services available yet.</p>
        ) : (
          <>
            {categories.length > 2 && (
              <div className="flex gap-2 flex-wrap justify-center mb-8">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all border ${
                      activeCategory === cat
                        ? "border-primary text-primary bg-primary/10"
                        : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
                    }`}
                  >
                    {cat === "all" ? "All" : cat}
                  </button>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((service) => (
                <div key={service.id} className="bg-card border border-border rounded-2xl overflow-hidden flex flex-col group hover:border-primary/40 transition-colors">
                  {service.image_url ? (
                    <div className="aspect-video overflow-hidden">
                      <img src={service.image_url} alt={service.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    </div>
                  ) : (
                    <div className="aspect-video bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                      <span className="text-3xl font-bold text-primary/20">{service.name[0]}</span>
                    </div>
                  )}
                  <div className="p-5 flex-1 flex flex-col">
                    {service.category && (
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{service.category}</p>
                    )}
                    <h3 className="font-semibold text-lg mb-2">{service.name}</h3>
                    {service.description && (
                      <p className="text-sm text-muted-foreground flex-1 mb-4">{service.description}</p>
                    )}
                    <div className="flex items-center justify-between mt-auto">
                      {service.starting_price && (
                        <span className="text-sm font-semibold text-primary">{service.starting_price}</span>
                      )}
                      <Link
                        href={CTA_LINKS[service.cta_type] || "/contact"}
                        className="ml-auto px-4 py-2 rounded-lg text-sm font-semibold gradient-brand text-white hover:opacity-90 transition-opacity"
                      >
                        {CTA_LABELS[service.cta_type] || "Enquire"}
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>

      <footer className="border-t border-border mt-16 py-8 text-center text-sm text-muted-foreground">
        <p>© {new Date().getFullYear()} {APP_CONFIG.appName}</p>
      </footer>
    </div>
  );
}
