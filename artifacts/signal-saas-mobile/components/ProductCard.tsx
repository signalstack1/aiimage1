import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { useColors } from "@/hooks/useColors";
import type { ApiPlan } from "@/lib/api";

function currencySymbol(c?: string) {
  return c === "gbp" ? "£" : "$";
}

function formatPrice(price_cents: number, currency?: string, interval?: string) {
  const sym = currencySymbol(currency);
  const amt = (price_cents / 100).toFixed(0);
  const sfx: Record<string, string> = { monthly: "/mo", yearly: "/yr", weekly: "/wk", quarterly: "/qtr" };
  return `${sym}${amt}${sfx[interval ?? ""] ?? ""}`;
}

export function ProductCard({ product, onPress }: { product: ApiPlan; onPress: () => void }) {
  const colors = useColors();
  const qty = product.stock_quantity ?? -1;
  const isOos = qty === 0;

  return (
    <Pressable
      onPress={onPress}
      disabled={isOos}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius * 2, opacity: pressed ? 0.9 : 1 },
      ]}
    >
      <View style={[styles.imageWrap, { backgroundColor: colors.accent }]}>
        {product.image_url ? (
          <Image source={{ uri: product.image_url }} style={styles.image} resizeMode="cover" />
        ) : (
          <Feather name="package" size={32} color={colors.mutedForeground} />
        )}
        {isOos && (
          <View style={[styles.stockBadge, { backgroundColor: colors.destructive }]}>
            <Text style={styles.stockBadgeText}>Out of stock</Text>
          </View>
        )}
      </View>
      <View style={styles.body}>
        {product.categories && (
          <Text style={[styles.category, { color: colors.mutedForeground }]} numberOfLines={1}>
            {product.categories.name}
          </Text>
        )}
        <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={2}>
          {product.name}
        </Text>
        <View style={styles.footer}>
          <Text style={[styles.price, { color: colors.foreground }]}>
            {formatPrice(product.price_cents, product.currency, product.interval)}
          </Text>
          <Feather name="arrow-right-circle" size={20} color={isOos ? colors.mutedForeground : colors.primary} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, borderWidth: 1, overflow: "hidden" },
  imageWrap: { aspectRatio: 4 / 3, alignItems: "center", justifyContent: "center" },
  image: { width: "100%", height: "100%" },
  stockBadge: { position: "absolute", top: 8, right: 8, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  stockBadgeText: { color: "#fff", fontSize: 10, fontWeight: "700" },
  body: { padding: 12, gap: 4 },
  category: { fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.4 },
  name: { fontSize: 14, fontWeight: "700", lineHeight: 18 },
  footer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 6 },
  price: { fontSize: 16, fontWeight: "800" },
});
