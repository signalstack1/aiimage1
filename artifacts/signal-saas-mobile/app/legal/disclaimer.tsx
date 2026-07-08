import { ScrollView, StyleSheet, Text } from "react-native";
import { Stack } from "expo-router";

import { APP_CONFIG } from "@/config/app";
import { useColors } from "@/hooks/useColors";

export default function DisclaimerScreen() {
  const colors = useColors();
  return (
    <>
      <Stack.Screen options={{ title: "Risk Disclaimer" }} />
      <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.foreground }]}>Risk Disclaimer</Text>
        {APP_CONFIG.disclaimerParagraphs.map((p, i) => (
          <Text key={i} style={[styles.paragraph, { color: colors.mutedForeground }]}>{p}</Text>
        ))}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 60, gap: 14 },
  title: { fontSize: 24, fontWeight: "800", marginBottom: 6 },
  paragraph: { fontSize: 13, lineHeight: 20 },
});
