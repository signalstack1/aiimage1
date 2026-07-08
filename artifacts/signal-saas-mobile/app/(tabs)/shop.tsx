import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { ProductCard } from "@/components/ProductCard";
import { useColors } from "@/hooks/useColors";
import { fetchPlans, type ApiPlan } from "@/lib/api";

type SortKey = "newest" | "price_asc" | "price_desc";

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "newest", label: "Newest" },
  { key: "price_asc", label: "Price ↑" },
  { key: "price_desc", label: "Price ↓" },
];

export default function ShopScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [products, setProducts] = useState<ApiPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("newest");

  useEffect(() => {
    fetchPlans().then(setProducts).finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let result = products;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((p) => p.name.toLowerCase().includes(q) || (p.description || "").toLowerCase().includes(q));
    }
    const arr = [...result];
    if (sort === "price_asc") arr.sort((a, b) => a.price_cents - b.price_cents);
    else if (sort === "price_desc") arr.sort((a, b) => b.price_cents - a.price_cents);
    else arr.sort((a, b) => (b.created_at ? new Date(b.created_at).getTime() : 0) - (a.created_at ? new Date(a.created_at).getTime() : 0));
    return arr;
  }, [products, search, sort]);

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: topInset }}>
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: colors.foreground }]}>Shop</Text>
        <Text style={[styles.count, { color: colors.mutedForeground }]}>
          {filtered.length} {filtered.length === 1 ? "product" : "products"}
        </Text>
      </View>

      <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
        <Feather name="search" size={16} color={colors.mutedForeground} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search products…"
          placeholderTextColor={colors.mutedForeground}
          style={[styles.searchInput, { color: colors.foreground }]}
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch("")}>
            <Feather name="x" size={16} color={colors.mutedForeground} />
          </Pressable>
        )}
      </View>

      <View style={styles.sortRow}>
        {SORT_OPTIONS.map((opt) => {
          const active = sort === opt.key;
          return (
            <Pressable
              key={opt.key}
              onPress={() => setSort(opt.key)}
              style={[styles.sortChip, { borderColor: active ? colors.primary : colors.border, backgroundColor: active ? `${colors.primary}16` : "transparent" }]}
            >
              <Text style={{ fontSize: 12, fontWeight: "600", color: active ? colors.primary : colors.mutedForeground }}>{opt.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <Feather name="package" size={40} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No products found</Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Check back soon.</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={{ gap: 12 }}
          contentContainerStyle={{ padding: 20, gap: 12, paddingBottom: bottomPad + 24 }}
          renderItem={({ item }) => <ProductCard product={item} onPress={() => router.push(`/product/${item.id}`)} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", alignItems: "baseline", gap: 8, paddingHorizontal: 20, paddingTop: 12 },
  title: { fontSize: 22, fontWeight: "800" },
  count: { fontSize: 13 },
  searchBar: { flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: 20, marginTop: 14, paddingHorizontal: 12, height: 42, borderWidth: 1 },
  searchInput: { flex: 1, fontSize: 14 },
  sortRow: { flexDirection: "row", gap: 8, paddingHorizontal: 20, marginTop: 12 },
  sortChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 16, fontWeight: "700", marginTop: 4 },
  emptyText: { fontSize: 13, textAlign: "center" },
});
