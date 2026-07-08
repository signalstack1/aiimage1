import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Stack } from "expo-router";

import { APP_CONFIG } from "@/config/app";
import { useColors } from "@/hooks/useColors";
import { fetchGalleryItems, type GalleryItem } from "@/lib/api";

export default function GalleryScreen() {
  const colors = useColors();
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("all");
  const [lightbox, setLightbox] = useState<GalleryItem | null>(null);

  useEffect(() => {
    fetchGalleryItems().then(setItems).finally(() => setLoading(false));
  }, []);

  const categories = useMemo(
    () => ["all", ...Array.from(new Set(items.map((i) => i.category).filter(Boolean)))],
    [items],
  );
  const filtered = activeCategory === "all" ? items : items.filter((i) => i.category === activeCategory);

  return (
    <>
      <Stack.Screen options={{ title: "Gallery" }} />
      <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.foreground }]}>Gallery</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>A selection of our work.</Text>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 32 }} />
        ) : !items.length ? (
          <Text style={[styles.empty, { color: colors.mutedForeground }]}>No gallery items yet.</Text>
        ) : (
          <>
            {categories.length > 2 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                {categories.map((cat) => {
                  const active = activeCategory === cat;
                  return (
                    <Pressable
                      key={cat}
                      onPress={() => setActiveCategory(cat)}
                      style={[
                        styles.chip,
                        { borderColor: active ? colors.primary : colors.border, backgroundColor: active ? `${colors.primary}18` : "transparent" },
                      ]}
                    >
                      <Text style={{ fontSize: 12, fontWeight: "600", color: active ? colors.primary : colors.mutedForeground }}>
                        {cat === "all" ? "All" : cat}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}

            <View style={styles.grid}>
              {filtered.map((item) => (
                <Pressable key={item.id} onPress={() => setLightbox(item)} style={[styles.tile, { backgroundColor: colors.card, borderRadius: colors.radius }]}>
                  {item.image_url ? (
                    <Image source={{ uri: item.image_url }} style={styles.tileImage} />
                  ) : (
                    <View style={[styles.tileImage, styles.tilePlaceholder, { backgroundColor: colors.muted }]}>
                      <Text style={{ fontSize: 24, fontWeight: "800", color: colors.mutedForeground }}>{(item.title || "?")[0]}</Text>
                    </View>
                  )}
                  {item.is_featured && (
                    <View style={styles.featuredBadge}>
                      <Text style={{ fontSize: 9, fontWeight: "700", color: "#000" }}>Featured</Text>
                    </View>
                  )}
                </Pressable>
              ))}
            </View>
          </>
        )}

        <Text style={[styles.footer, { color: colors.mutedForeground }]}>© {new Date().getFullYear()} {APP_CONFIG.appName}</Text>
      </ScrollView>

      <Modal visible={!!lightbox} transparent animationType="fade" onRequestClose={() => setLightbox(null)}>
        <Pressable style={styles.lightboxBackdrop} onPress={() => setLightbox(null)}>
          <View style={styles.lightboxContent}>
            {lightbox?.image_url && <Image source={{ uri: lightbox.image_url }} style={styles.lightboxImage} resizeMode="contain" />}
            {!!lightbox?.title && <Text style={styles.lightboxTitle}>{lightbox.title}</Text>}
            {!!lightbox?.description && <Text style={styles.lightboxDesc}>{lightbox.description}</Text>}
            <Pressable onPress={() => setLightbox(null)} style={styles.lightboxClose}>
              <Feather name="x" size={16} color="#fff" />
              <Text style={{ color: "#fff", fontSize: 13 }}>Close</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 26, fontWeight: "800", textAlign: "center" },
  subtitle: { fontSize: 13, textAlign: "center", marginTop: 6, marginBottom: 20 },
  empty: { textAlign: "center", paddingVertical: 40, fontSize: 13 },
  chipRow: { gap: 8, paddingBottom: 16 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, borderWidth: 1 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  tile: { width: "31.5%", aspectRatio: 1, overflow: "hidden" },
  tileImage: { width: "100%", height: "100%" },
  tilePlaceholder: { alignItems: "center", justifyContent: "center" },
  featuredBadge: { position: "absolute", top: 6, right: 6, backgroundColor: "#fbbf24", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  footer: { fontSize: 11, textAlign: "center", marginTop: 32 },
  lightboxBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.92)", alignItems: "center", justifyContent: "center", padding: 24 },
  lightboxContent: { width: "100%", gap: 10 },
  lightboxImage: { width: "100%", height: 320, borderRadius: 12 },
  lightboxTitle: { color: "#fff", fontWeight: "700", fontSize: 14 },
  lightboxDesc: { color: "rgba(255,255,255,0.7)", fontSize: 12 },
  lightboxClose: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", marginTop: 4 },
});
