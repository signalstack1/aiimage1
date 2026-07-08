import { useEffect, useState } from "react";
import { Link } from "wouter";
import { APP_CONFIG } from "@/config/app";

interface GalleryItem {
  id: string;
  title: string;
  image_url: string;
  category: string;
  description: string;
  is_featured: boolean;
}

export default function GalleryPage() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [lightbox, setLightbox] = useState<GalleryItem | null>(null);

  useEffect(() => {
    fetch("/api/gallery")
      .then((r) => r.json())
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setLightbox(null); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const categories = ["all", ...Array.from(new Set(items.map((i) => i.category).filter(Boolean)))];
  const filtered = activeCategory === "all" ? items : items.filter((i) => i.category === activeCategory);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card/40 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="font-bold text-lg tracking-tight">{APP_CONFIG.appName}</Link>
        <nav className="flex items-center gap-6 text-sm text-muted-foreground">
          <Link href="/services" className="hover:text-foreground transition-colors">Services</Link>
          <Link href="/gallery" className="text-foreground font-medium">Gallery</Link>
          <Link href="/contact" className="hover:text-foreground transition-colors">Contact</Link>
        </nav>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-3">Gallery</h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            A selection of our work.
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[1,2,3,4,5,6].map((i) => (
              <div key={i} className="aspect-square bg-muted rounded-xl animate-pulse" />
            ))}
          </div>
        ) : !items.length ? (
          <p className="text-center text-muted-foreground py-16">No gallery items yet.</p>
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

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {filtered.map((item) => (
                <div
                  key={item.id}
                  className="group relative aspect-square rounded-xl overflow-hidden bg-muted cursor-pointer"
                  onClick={() => setLightbox(item)}
                >
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted">
                      <span className="text-4xl font-bold text-muted-foreground/20">{(item.title || "?")[0]}</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                    <p className="text-white font-semibold text-sm">{item.title}</p>
                    {item.category && <p className="text-white/70 text-xs">{item.category}</p>}
                  </div>
                  {item.is_featured && (
                    <span className="absolute top-2 right-2 text-[10px] bg-amber-400/90 text-black px-1.5 py-0.5 rounded font-semibold">Featured</span>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </main>

      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-6"
          onClick={() => setLightbox(null)}
        >
          <div className="max-w-3xl w-full space-y-3" onClick={(e) => e.stopPropagation()}>
            {lightbox.image_url && (
              <img src={lightbox.image_url} alt={lightbox.title} className="w-full rounded-xl max-h-[70vh] object-contain" />
            )}
            {(lightbox.title || lightbox.description) && (
              <div className="text-white">
                {lightbox.title && <p className="font-semibold">{lightbox.title}</p>}
                {lightbox.description && <p className="text-sm text-white/70 mt-1">{lightbox.description}</p>}
              </div>
            )}
            <button onClick={() => setLightbox(null)} className="text-sm text-white/60 hover:text-white">Close ✕</button>
          </div>
        </div>
      )}

      <footer className="border-t border-border mt-16 py-8 text-center text-sm text-muted-foreground">
        <p>© {new Date().getFullYear()} {APP_CONFIG.appName}</p>
      </footer>
    </div>
  );
}
