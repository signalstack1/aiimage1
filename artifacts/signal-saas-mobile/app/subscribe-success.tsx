import { useEffect, useState } from "react";
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";

import { APP_CONFIG } from "@/config/app";
import { useColors } from "@/hooks/useColors";
import { fetchAccessLinks, type AccessLink } from "@/lib/api";

export default function SubscribeSuccessScreen() {
  const colors = useColors();
  const router = useRouter();
  const [links, setLinks] = useState<AccessLink[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAccessLinks().then(setLinks).finally(() => setLoading(false));
  }, []);

  return (
    <>
      <Stack.Screen options={{ title: "" }} />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.iconCircle, { backgroundColor: "#10b98118", borderColor: "#10b98155" }]}>
          <Feather name="check-circle" size={40} color="#10b981" />
        </View>
        <Text style={[styles.heading, { color: colors.foreground }]}>{APP_CONFIG.successPage.heading}</Text>
        <Text style={[styles.subtext, { color: colors.mutedForeground }]}>{APP_CONFIG.successPage.subtext}</Text>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: 24 }} />
        ) : links.length === 0 ? (
          <View style={[styles.notice, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
            <Text style={{ color: colors.mutedForeground, fontSize: 13, textAlign: "center" }}>
              Your access links are being prepared. Contact {APP_CONFIG.supportEmail}.
            </Text>
          </View>
        ) : (
          <View style={{ width: "100%", gap: 12 }}>
            {links.map((link) => (
              <View key={link.id} style={[styles.linkCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius * 1.5 }]}>
                <View style={styles.linkHeader}>
                  <View style={[styles.linkIcon, { backgroundColor: colors.accent }]}>
                    <Feather name={link.platform === "discord" ? "message-circle" : "send"} size={18} color={colors.foreground} />
                  </View>
                  <View>
                    <Text style={{ color: colors.foreground, fontWeight: "600", fontSize: 13 }}>{link.label}</Text>
                    <Text style={{ color: colors.mutedForeground, fontSize: 11, textTransform: "capitalize" }}>{link.platform} · Private channel</Text>
                  </View>
                </View>
                <Pressable onPress={() => Linking.openURL(link.invite_url)} style={[styles.joinButton, { backgroundColor: colors.primary, borderRadius: colors.radius }]}>
                  <Feather name="message-circle" size={15} color={colors.primaryForeground} />
                  <Text style={{ color: colors.primaryForeground, fontWeight: "700" }}>
                    Join {link.platform === "discord" ? "Discord" : link.platform === "telegram" ? "Telegram" : link.label}
                  </Text>
                  <Feather name="external-link" size={14} color={colors.primaryForeground} />
                </Pressable>
              </View>
            ))}
          </View>
        )}

        <Pressable onPress={() => router.replace("/")} style={[styles.backButton, { borderColor: colors.border, borderRadius: colors.radius }]}>
          <Text style={{ color: colors.foreground, fontWeight: "600", fontSize: 13 }}>Back to home</Text>
        </Pressable>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12 },
  iconCircle: { width: 80, height: 80, borderRadius: 40, borderWidth: 2, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  heading: { fontSize: 24, fontWeight: "800" },
  subtext: { fontSize: 14, textAlign: "center", marginBottom: 8 },
  notice: { borderWidth: 1, padding: 16, width: "100%" },
  linkCard: { borderWidth: 1, padding: 16, gap: 14 },
  linkHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  linkIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  joinButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 46 },
  backButton: { marginTop: 16, paddingHorizontal: 20, paddingVertical: 10, borderWidth: 1 },
});
