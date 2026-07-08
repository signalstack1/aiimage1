import { Linking, ScrollView, StyleSheet, Text } from "react-native";
import { Stack } from "expo-router";

import { APP_CONFIG } from "@/config/app";
import { useColors } from "@/hooks/useColors";

export default function PrivacyScreen() {
  const colors = useColors();
  return (
    <>
      <Stack.Screen options={{ title: "Privacy Policy" }} />
      <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.foreground }]}>Privacy Policy</Text>
        <Text style={[styles.paragraph, { color: colors.mutedForeground }]}>
          We collect only the information necessary to process your subscription and deliver our service.
        </Text>

        <Text style={[styles.heading, { color: colors.foreground }]}>Information We Collect</Text>
        <Text style={[styles.paragraph, { color: colors.mutedForeground }]}>
          When you subscribe, your payment is processed securely — we never see or store your card details. We
          receive your email address to manage your subscription and provide access to our channels.
        </Text>

        <Text style={[styles.heading, { color: colors.foreground }]}>How We Use It</Text>
        <Text style={[styles.paragraph, { color: colors.mutedForeground }]}>
          Your email is used only to manage your subscription and send important account notifications. We do not
          sell, rent, or share your personal information with third parties for marketing purposes.
        </Text>

        <Text style={[styles.heading, { color: colors.foreground }]}>Data Retention</Text>
        <Text style={[styles.paragraph, { color: colors.mutedForeground }]}>
          We retain subscription records as required for accounting and legal compliance. You may request deletion
          of your data by contacting us at{" "}
          <Text style={{ color: colors.primary }} onPress={() => Linking.openURL(`mailto:${APP_CONFIG.supportEmail}`)}>
            {APP_CONFIG.supportEmail}
          </Text>
          .
        </Text>

        <Text style={[styles.heading, { color: colors.foreground }]}>Cookies</Text>
        <Text style={[styles.paragraph, { color: colors.mutedForeground }]}>
          This app uses no tracking cookies. Payment processors may set cookies per their own privacy policies.
        </Text>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 60, gap: 10 },
  title: { fontSize: 24, fontWeight: "800", marginBottom: 6 },
  heading: { fontSize: 15, fontWeight: "700", marginTop: 10 },
  paragraph: { fontSize: 13, lineHeight: 20 },
});
