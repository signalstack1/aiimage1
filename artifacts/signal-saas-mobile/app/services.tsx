import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";

import { APP_CONFIG } from "@/config/app";
import { useColors } from "@/hooks/useColors";
import { fetchServices, type ApiService } from "@/lib/api";

const CTA_LABELS: Record<string, string> = { book: "Book Now", quote: "Request Quote", call: "Call Now", whatsapp: "WhatsApp" };

export default function ServicesScreen() {
  const colors = useColors();
  const router = useRouter();
  const [services, setServices] = useState<ApiService[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("all");

  useEffect(() => {
    fetchServices().then(setServices).finally(() => setLoading(false));
  }, []);

  const categories = useMemo(
    () => ["all", ...Array.from(new Set(services.map((s) => s.category).filter(Boolean)))],
    [services],
  );
  const filtered = activeCategory === "all" ? services : services.filter((s) => s.category === activeCategory);

  const handlePress = (service: ApiService) => {
    if (service.cta_type === "book") router.push("/book");
    else router.push("/contact");
  };

  return (
    <>
      <Stack.Screen options={{ title: "Services" }} />
      <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.foreground }]}>Our Services</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Professional services tailored to your needs.</Text>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 32 }} />
        ) : !services.length ? (
          <Text style={[styles.empty, { color: colors.mutedForeground }]}>No services available yet.</Text>
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

            <View style={{ gap: 14, marginTop: 8 }}>
              {filtered.map((service) => (
                <View key={service.id} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius * 1.5 }]}>
                  {service.image_url ? (
                    <Image source={{ uri: service.image_url }} style={styles.image} />
                  ) : (
                    <View style={[styles.imagePlaceholder, { backgroundColor: `${colors.primary}12` }]}>
                      <Text style={{ fontSize: 28, fontWeight: "800", color: `${colors.primary}44` }}>{service.name?.[0] ?? "?"}</Text>
                    </View>
                  )}
                  <View style={{ padding: 16, gap: 4 }}>
                    {!!service.category && (
                      <Text style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, color: colors.mutedForeground }}>{service.category}</Text>
                    )}
                    <Text style={{ fontSize: 16, fontWeight: "700", color: colors.foreground }}>{service.name}</Text>
                    {!!service.description && <Text style={{ fontSize: 13, color: colors.mutedForeground }}>{service.description}</Text>}
                    <View style={styles.cardFooter}>
                      {!!service.starting_price && <Text style={{ fontSize: 13, fontWeight: "700", color: colors.primary }}>{service.starting_price}</Text>}
                      <Pressable onPress={() => handlePress(service)} style={[styles.ctaButton, { backgroundColor: colors.primary, borderRadius: colors.radius }]}>
                        <Text style={{ color: colors.primaryForeground, fontWeight: "700", fontSize: 12 }}>{CTA_LABELS[service.cta_type] || "Enquire"}</Text>
                        <Feather name="arrow-right" size={12} color={colors.primaryForeground} />
                      </Pressable>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        <Text style={[styles.footer, { color: colors.mutedForeground }]}>© {new Date().getFullYear()} {APP_CONFIG.appName}</Text>
      </ScrollView>
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
  card: { borderWidth: 1, overflow: "hidden" },
  image: { width: "100%", height: 140 },
  imagePlaceholder: { width: "100%", height: 140, alignItems: "center", justifyContent: "center" },
  cardFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8 },
  ctaButton: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8 },
  footer: { fontSize: 11, textAlign: "center", marginTop: 32 },
});
