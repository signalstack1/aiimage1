import { useEffect, useState } from "react";
import { ActivityIndicator, Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";

import { useColors } from "@/hooks/useColors";
import { fetchPlanById, type ApiPlan } from "@/lib/api";

function currencySymbol(c?: string) {
  return c === "gbp" ? "£" : "$";
}
function formatInterval(interval: string): string | null {
  if (interval === "one-time" || interval === "lifetime") return null;
  const map: Record<string, string> = { weekly: "wk", monthly: "mo", quarterly: "qtr", yearly: "yr" };
  return map[interval] ?? null;
}
function intervalLabel(interval: string): string {
  const map: Record<string, string> = {
    "one-time": "One-time payment",
    weekly: "Billed weekly",
    monthly: "Billed monthly",
    quarterly: "Billed quarterly",
    yearly: "Billed yearly",
    lifetime: "Lifetime access",
  };
  return map[interval] ?? "";
}

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const router = useRouter();
  const [product, setProduct] = useState<ApiPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [selectedDelivery, setSelectedDelivery] = useState<"free" | "faster" | null>(null);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetchPlanById(id)
      .then((p) => {
        if (!p) {
          setNotFound(true);
          return;
        }
        setProduct(p);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (notFound || !product) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background, gap: 12 }]}>
        <Feather name="package" size={40} color={colors.mutedForeground} />
        <Text style={{ fontSize: 18, fontWeight: "700", color: colors.foreground }}>Product not found</Text>
        <Pressable onPress={() => router.back()} style={[styles.backBtn, { borderColor: colors.border, borderRadius: colors.radius }]}>
          <Text style={{ color: colors.foreground, fontWeight: "600" }}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const variants = (product.product_variants || []).slice().sort((a, b) => a.sort_order - b.sort_order);
  const tags = (product.product_tags || []).map((pt) => pt.tags).filter(Boolean);
  const symbol = currencySymbol(product.currency);
  const price = (product.price_cents / 100).toFixed(0);
  const period = formatInterval(product.interval);
  const intLabel = intervalLabel(product.interval);
  const btnLabel = product.button_label || (product.interval === "one-time" || product.interval === "lifetime" ? "Buy Now" : "Subscribe");

  const hasVariants = variants.length > 0;
  const allVariantsSelected = variants.every((v) => selectedOptions[v.id]);
  const stockQty = product.stock_quantity ?? -1;
  const isOutOfStock = stockQty === 0;
  const isLimited = stockQty > 0;

  const hasFreeDelivery = product.free_delivery_enabled ?? false;
  const hasFasterDelivery = product.faster_delivery_enabled ?? false;
  const bothDelivery = hasFreeDelivery && hasFasterDelivery;
  const deliveryChoiceRequired = bothDelivery && selectedDelivery === null;

  const activePaymentUrl: string | null | undefined = bothDelivery
    ? selectedDelivery === "faster"
      ? product.faster_delivery_payment_link
      : selectedDelivery === "free"
        ? product.payment_url
        : null
    : hasFasterDelivery && !hasFreeDelivery
      ? product.faster_delivery_payment_link
      : product.payment_url;

  const canBuy = !isOutOfStock && (!hasVariants || allVariantsSelected) && !!activePaymentUrl && !deliveryChoiceRequired;

  const handleBuy = async () => {
    if (!canBuy || !activePaymentUrl) return;
    setRedirecting(true);
    await Linking.openURL(activePaymentUrl).catch(() => {});
    setRedirecting(false);
  };

  return (
    <>
      <Stack.Screen options={{ title: product.name }} />
      <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={{ padding: 20, gap: 20 }}>
        <View style={[styles.imageWrap, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius * 2 }]}>
          {product.image_url ? (
            <Image source={{ uri: product.image_url }} style={styles.image} resizeMode="cover" />
          ) : (
            <Feather name="package" size={48} color={colors.mutedForeground} />
          )}
        </View>

        <View style={{ gap: 10 }}>
          {product.categories && <Text style={[styles.category, { color: colors.mutedForeground }]}>{product.categories.name}</Text>}
          <Text style={[styles.name, { color: colors.foreground }]}>{product.name}</Text>
          {tags.length > 0 && (
            <View style={styles.tagRow}>
              {tags.map((t) => (
                <View key={t.id} style={[styles.tag, { backgroundColor: colors.accent }]}>
                  <Text style={{ fontSize: 11, color: colors.accentForeground }}>{t.name}</Text>
                </View>
              ))}
            </View>
          )}
          <View style={styles.priceRow}>
            <Text style={[styles.price, { color: colors.foreground }]}>
              {symbol}
              {price}
            </Text>
            {period && <Text style={[styles.period, { color: colors.mutedForeground }]}>/{period}</Text>}
          </View>
          {!!intLabel && <Text style={{ fontSize: 12, color: colors.mutedForeground }}>{intLabel}</Text>}
          {!!product.description && <Text style={{ fontSize: 14, lineHeight: 21, color: colors.mutedForeground }}>{product.description}</Text>}
        </View>

        {hasVariants && (
          <View style={{ gap: 16 }}>
            {variants.map((variant) => (
              <View key={variant.id} style={{ gap: 8 }}>
                <Text style={{ fontSize: 13, fontWeight: "600", color: colors.foreground }}>{variant.name}</Text>
                <View style={styles.tagRow}>
                  {variant.product_variant_options
                    .slice()
                    .sort((a, b) => a.sort_order - b.sort_order)
                    .map((opt) => {
                      const active = selectedOptions[variant.id] === opt.value;
                      return (
                        <Pressable
                          key={opt.id}
                          onPress={() => setSelectedOptions((p) => ({ ...p, [variant.id]: opt.value }))}
                          style={[styles.optionChip, { borderColor: active ? colors.primary : colors.border, backgroundColor: active ? `${colors.primary}16` : "transparent" }]}
                        >
                          <Text style={{ fontSize: 12, fontWeight: "600", color: active ? colors.primary : colors.foreground }}>{opt.value}</Text>
                        </Pressable>
                      );
                    })}
                </View>
              </View>
            ))}
          </View>
        )}

        {(hasFreeDelivery || hasFasterDelivery) && (
          <View style={{ gap: 8 }}>
            {bothDelivery ? (
              <>
                <Text style={{ fontSize: 13, fontWeight: "600", color: colors.foreground }}>Choose delivery</Text>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <Pressable
                    onPress={() => setSelectedDelivery("free")}
                    style={[styles.deliveryOption, { borderColor: selectedDelivery === "free" ? colors.primary : colors.border, backgroundColor: selectedDelivery === "free" ? `${colors.primary}0d` : colors.card }]}
                  >
                    <Feather name="truck" size={16} color={colors.mutedForeground} />
                    <View>
                      <Text style={{ fontSize: 13, fontWeight: "600", color: colors.foreground }}>Free delivery</Text>
                      <Text style={{ fontSize: 11, color: colors.mutedForeground }}>Included in price</Text>
                    </View>
                  </Pressable>
                  <Pressable
                    onPress={() => setSelectedDelivery("faster")}
                    style={[styles.deliveryOption, { borderColor: selectedDelivery === "faster" ? colors.primary : colors.border, backgroundColor: selectedDelivery === "faster" ? `${colors.primary}0d` : colors.card }]}
                  >
                    <Feather name="zap" size={16} color={colors.mutedForeground} />
                    <View>
                      <Text style={{ fontSize: 13, fontWeight: "600", color: colors.foreground }}>Faster delivery</Text>
                      <Text style={{ fontSize: 11, color: colors.mutedForeground }}>Express courier</Text>
                    </View>
                  </Pressable>
                </View>
              </>
            ) : (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Feather name={hasFasterDelivery ? "zap" : "truck"} size={16} color={colors.primary} />
                <Text style={{ fontSize: 13, color: colors.foreground }}>{hasFasterDelivery ? "Faster delivery" : "Free delivery"}</Text>
              </View>
            )}
          </View>
        )}

        {isOutOfStock ? (
          <View style={[styles.stockNotice, { backgroundColor: `${colors.destructive}16`, borderColor: `${colors.destructive}33` }]}>
            <Feather name="alert-triangle" size={14} color={colors.destructive} />
            <Text style={{ color: colors.destructive, fontSize: 13 }}>Out of stock</Text>
          </View>
        ) : product.show_stock && isLimited ? (
          <Text style={{ fontSize: 13, fontWeight: "600", color: "#fbbf24" }}>Only {stockQty} left in stock</Text>
        ) : null}

        <View style={{ gap: 8 }}>
          {!product.payment_url && !product.faster_delivery_payment_link ? (
            <View style={[styles.buyButton, { backgroundColor: colors.muted, borderRadius: colors.radius }]}>
              <Text style={{ color: colors.mutedForeground, fontWeight: "700" }}>Coming soon</Text>
            </View>
          ) : (
            <Pressable
              onPress={handleBuy}
              disabled={!canBuy || redirecting}
              style={[styles.buyButton, { backgroundColor: colors.primary, borderRadius: colors.radius, opacity: !canBuy || redirecting ? 0.5 : 1 }]}
            >
              {redirecting ? (
                <ActivityIndicator color={colors.primaryForeground} />
              ) : (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Feather name="shopping-cart" size={16} color={colors.primaryForeground} />
                  <Text style={{ color: colors.primaryForeground, fontWeight: "700", fontSize: 15 }}>{btnLabel}</Text>
                </View>
              )}
            </Pressable>
          )}
          {hasVariants && !allVariantsSelected && (
            <Text style={{ fontSize: 12, textAlign: "center", color: colors.mutedForeground }}>Please select all options above before buying.</Text>
          )}
          {deliveryChoiceRequired && (
            <Text style={{ fontSize: 12, textAlign: "center", color: colors.mutedForeground }}>Please choose a delivery option above before buying.</Text>
          )}
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  backBtn: { paddingHorizontal: 16, paddingVertical: 10, borderWidth: 1 },
  imageWrap: { aspectRatio: 1, borderWidth: 1, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  image: { width: "100%", height: "100%" },
  category: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.4 },
  name: { fontSize: 24, fontWeight: "800", lineHeight: 30 },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  priceRow: { flexDirection: "row", alignItems: "flex-end", gap: 6 },
  price: { fontSize: 32, fontWeight: "800" },
  period: { fontSize: 13, marginBottom: 4 },
  optionChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  deliveryOption: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderRadius: 12, padding: 12 },
  stockNotice: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderRadius: 10, padding: 12 },
  buyButton: { height: 52, alignItems: "center", justifyContent: "center" },
});
