import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";

import { APP_CONFIG } from "@/config/app";
import { useColors } from "@/hooks/useColors";
import { useAdminAuth } from "@/lib/admin-auth";
import { fetchAdminAccessLinks, type AccessLink } from "@/lib/api";

export default function AdminAccessScreen() {
  const colors = useColors();
  const router = useRouter();
  const { token } = useAdminAuth();
  const [links, setLinks] = useState<AccessLink[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      router.replace("/admin");
      return;
    }
    fetchAdminAccessLinks(token).then(setLinks).finally(() => setLoading(false));
  }, [token]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{ title: APP_CONFIG.admin.access.plural }} />
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : links.length === 0 ? (
        <View style={styles.center}>
          <Feather name="key" size={36} color={colors.mutedForeground} />
          <Text style={{ color: colors.mutedForeground, marginTop: 8 }}>No access links yet.</Text>
        </View>
      ) : (
        <FlatList
          data={links}
          keyExtractor={(l) => l.id}
          contentContainerStyle={{ padding: 20, gap: 10 }}
          renderItem={({ item }) => (
            <View style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
              <View style={[styles.icon, { backgroundColor: colors.accent }]}>
                <Feather name={item.platform === "discord" ? "message-circle" : "send"} size={16} color={colors.foreground} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.foreground, fontWeight: "600", fontSize: 13 }} numberOfLines={1}>
                  {item.label}
                </Text>
                <Text style={{ color: colors.mutedForeground, fontSize: 11 }} numberOfLines={1}>
                  {item.invite_url}
                </Text>
              </View>
              <Pressable onPress={() => Linking.openURL(item.invite_url)}>
                <Feather name="external-link" size={16} color={colors.mutedForeground} />
              </Pressable>
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
  icon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
});
