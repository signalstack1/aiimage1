import { Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";

import { APP_CONFIG } from "@/config/app";
import { useColors } from "@/hooks/useColors";

export default function SubscribeCancelScreen() {
  const colors = useColors();
  const router = useRouter();

  return (
    <>
      <Stack.Screen options={{ title: "" }} />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.iconCircle, { backgroundColor: colors.muted, borderColor: colors.border }]}>
          <Feather name="x-circle" size={40} color={colors.mutedForeground} />
        </View>
        <Text style={[styles.heading, { color: colors.foreground }]}>Payment cancelled</Text>
        <Text style={[styles.subtext, { color: colors.mutedForeground }]}>
          No worries — you haven't been charged. Come back whenever you're ready.
        </Text>
        <Pressable onPress={() => router.replace("/")} style={[styles.button, { backgroundColor: colors.primary, borderRadius: colors.radius }]}>
          <Text style={{ color: colors.primaryForeground, fontWeight: "700" }}>View plans again</Text>
        </Pressable>
        <View style={styles.poweredBy}>
          <Feather name="trending-up" size={12} color={colors.primary} />
          <Text style={{ color: colors.mutedForeground, fontSize: 11 }}>Powered by {APP_CONFIG.appName}</Text>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12 },
  iconCircle: { width: 80, height: 80, borderRadius: 40, borderWidth: 2, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  heading: { fontSize: 24, fontWeight: "800" },
  subtext: { fontSize: 14, textAlign: "center", marginBottom: 8, paddingHorizontal: 12 },
  button: { paddingHorizontal: 24, paddingVertical: 12, marginTop: 4 },
  poweredBy: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 16 },
});
