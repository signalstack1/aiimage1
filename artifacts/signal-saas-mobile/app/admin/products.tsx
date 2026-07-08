import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Image, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";

import { APP_CONFIG } from "@/config/app";
import { useColors } from "@/hooks/useColors";
import { useAdminAuth } from "@/lib/admin-auth";
import { fetchAdminProducts, type ApiPlan } from "@/lib/api";

export default function AdminProductsScreen() {
  const colors = useColors();
  const router = useRouter();
  const { token } = useAdminAuth();
  const [products, setProducts] = useState<ApiPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      router.replace("/admin");
      return;
    }
    fetchAdminProducts(token).then(setProducts).finally(() => setLoading(false));
  }, [token]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{ title: APP_CONFIG.admin.products.plural }} />
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : products.length === 0 ? (
        <View style={styles.center}>
          <Feather name="package" size={36} color={colors.mutedForeground} />
          <Text style={{ color: colors.mutedForeground, marginTop: 8 }}>No products yet.</Text>
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(p) => p.id}
          contentContainerStyle={{ padding: 20, gap: 10 }}
          renderItem={({ item }) => (
            <View style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
              <View style={[styles.thumb, { backgroundColor: colors.accent }]}>
                {item.image_url ? <Image source={{ uri: item.image_url }} style={styles.thumbImg} /> : <Feather name="image" size={16} color={colors.mutedForeground} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.foreground, fontWeight: "700", fontSize: 14 }} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={{ color: colors.mutedForeground, fontSize: 12, marginTop: 2 }}>
                  {item.is_active ? "Live" : "Draft"} · ${(item.price_cents / 100).toFixed(0)}
                </Text>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  row: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, padding: 12 },
  thumb: { width: 42, height: 42, borderRadius: 10, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  thumbImg: { width: "100%", height: "100%" },
});
