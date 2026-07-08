import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { useColors } from "@/hooks/useColors";
import type { ApiPlan } from "@/lib/api";

function currencySymbol(c?: string) {
  return c === "gbp" ? "£" : "$";
}

function formatInterval(interval: string): string | null {
  if (interval === "one-time" || interval === "lifetime") return null;
  const map: Record<string, string> = { weekly: "wk", monthly: "mo", quarterly: "qtr", yearly: "yr" };
  return map[interval] ?? interval;
}

interface Props {
  plan: ApiPlan;
  features: string[];
  highlight: boolean;
  loading?: boolean;
  onPress: () => void;
}

export function PlanCard({ plan, features, highlight, loading, onPress }: Props) {
  const colors = useColors();
  const price = (plan.price_cents / 100).toFixed(0);
  const period = formatInterval(plan.interval);
  const symbol = currencySymbol(plan.currency);
  const hasVariants = (plan.product_variants?.length ?? 0) > 0;
  const stockQty = plan.stock_quantity ?? -1;
  const isOutOfStock = stockQty === 0;
  const disabled = !!loading || isOutOfStock || (!hasVariants && !plan.payment_url);
  const buttonLabel = loading
    ? "Redirecting…"
    : isOutOfStock
      ? "Out of stock"
      : hasVariants
        ? "View options"
        : plan.button_label || (plan.interval === "one-time" || plan.interval === "lifetime" ? "Buy Now" : "Subscribe");

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: highlight ? colors.primary : colors.border,
          borderRadius: colors.radius * 2,
          borderWidth: highlight ? 1.5 : 1,
        },
      ]}
    >
      {highlight && (
        <View style={[styles.badge, { backgroundColor: colors.primary }]}>
          <Text style={styles.badgeText}>Most Popular</Text>
        </View>
      )}
      <Text style={[styles.name, { color: colors.mutedForeground }]}>{plan.name}</Text>
      <View style={styles.priceRow}>
        <Text style={[styles.price, { color: colors.foreground }]}>
          {symbol}
          {price}
        </Text>
        {period && <Text style={[styles.period, { color: colors.mutedForeground }]}>/{period}</Text>}
      </View>
      {!!plan.description && <Text style={[styles.desc, { color: colors.mutedForeground }]}>{plan.description}</Text>}
      {features.length > 0 && (
        <View style={styles.featureList}>
          {features.map((f) => (
            <View key={f} style={styles.featureRow}>
              <Feather name="check-circle" size={14} color={colors.primary} />
              <Text style={[styles.featureText, { color: colors.foreground }]}>{f}</Text>
            </View>
          ))}
        </View>
      )}
      <Pressable
        onPress={onPress}
        disabled={disabled}
        style={({ pressed }) => [
          styles.button,
          {
            backgroundColor: highlight ? colors.primary : "transparent",
            borderColor: colors.border,
            borderRadius: colors.radius,
            opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
          },
        ]}
      >
        {loading ? (
          <ActivityIndicator color={highlight ? colors.primaryForeground : colors.foreground} />
        ) : (
          <Text style={[styles.buttonText, { color: highlight ? colors.primaryForeground : colors.foreground }]}>
            {buttonLabel}
          </Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 20, gap: 4 },
  badge: { position: "absolute", top: -10, alignSelf: "center", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999 },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  name: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginTop: 6 },
  priceRow: { flexDirection: "row", alignItems: "flex-end", gap: 4, marginTop: 4 },
  price: { fontSize: 34, fontWeight: "800" },
  period: { fontSize: 13, marginBottom: 4 },
  desc: { fontSize: 13, marginTop: 4, marginBottom: 4 },
  featureList: { gap: 8, marginVertical: 10 },
  featureRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  featureText: { fontSize: 13, flex: 1, lineHeight: 18 },
  button: { height: 46, borderWidth: 1, alignItems: "center", justifyContent: "center", marginTop: 8 },
  buttonText: { fontSize: 14, fontWeight: "700" },
});
