import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";

import { APP_CONFIG } from "@/config/app";
import { useColors } from "@/hooks/useColors";
import { useAdminAuth } from "@/lib/admin-auth";
import { fetchAdminCustomers, type Customer } from "@/lib/api";

export default function AdminCustomersScreen() {
  const colors = useColors();
  const router = useRouter();
  const { token } = useAdminAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      router.replace("/admin");
      return;
    }
    fetchAdminCustomers(token).then(setCustomers).finally(() => setLoading(false));
  }, [token]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{ title: APP_CONFIG.admin.customers.plural }} />
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : customers.length === 0 ? (
        <View style={styles.center}>
          <Feather name="users" size={36} color={colors.mutedForeground} />
          <Text style={{ color: colors.mutedForeground, marginTop: 8 }}>No customers yet.</Text>
        </View>
      ) : (
        <FlatList
          data={customers}
          keyExtractor={(c) => c.id}
          contentContainerStyle={{ padding: 20, gap: 10 }}
          renderItem={({ item }) => (
            <View style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.foreground, fontWeight: "600", fontSize: 13 }} numberOfLines={1}>
                  {item.email}
                </Text>
                <Text style={{ color: colors.mutedForeground, fontSize: 12, marginTop: 2 }}>
                  {item.plan} · {new Date(item.subscribed_at).toLocaleDateString()}
                </Text>
              </View>
              <View style={[styles.statusPill, { backgroundColor: item.status === "active" ? "#10b98122" : colors.muted }]}>
                <Text style={{ fontSize: 11, fontWeight: "600", color: item.status === "active" ? "#10b981" : colors.mutedForeground }}>{item.status}</Text>
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
  row: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, padding: 14 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
});
