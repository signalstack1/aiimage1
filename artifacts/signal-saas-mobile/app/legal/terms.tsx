import { Fragment } from "react";
import { Linking, ScrollView, StyleSheet, Text } from "react-native";
import { Stack } from "expo-router";

import { APP_CONFIG } from "@/config/app";
import { useColors } from "@/hooks/useColors";

export default function TermsScreen() {
  const colors = useColors();
  return (
    <>
      <Stack.Screen options={{ title: "Terms of Service" }} />
      <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.foreground }]}>Terms of Service</Text>
        <Text style={[styles.paragraph, { color: colors.mutedForeground }]}>
          By subscribing to {APP_CONFIG.legalName}, you agree to these terms of service.
        </Text>

        <Text style={[styles.heading, { color: colors.foreground }]}>Subscriptions</Text>
        <Text style={[styles.paragraph, { color: colors.mutedForeground }]}>
          Monthly subscriptions are billed in advance and renew automatically. You may cancel at any time; access
          continues until the end of your billing period. Lifetime plans are a one-time payment with no renewal.
        </Text>

        <Text style={[styles.heading, { color: colors.foreground }]}>Refund Policy</Text>
        <Text style={[styles.paragraph, { color: colors.mutedForeground }]}>
          Due to the digital nature of this product, we do not offer refunds once access has been granted. If you
          experience technical issues preventing access, contact us at{" "}
          <Text style={{ color: colors.primary }} onPress={() => Linking.openURL(`mailto:${APP_CONFIG.supportEmail}`)}>
            {APP_CONFIG.supportEmail}
          </Text>{" "}
          within 48 hours of purchase.
        </Text>

        <Text style={[styles.heading, { color: colors.foreground }]}>Prohibited Use</Text>
        <Text style={[styles.paragraph, { color: colors.mutedForeground }]}>
          You may not share, redistribute, or resell access to our content or channels. Violation may result in
          immediate cancellation without refund.
        </Text>

        {APP_CONFIG.termsExtraSections.map(({ heading, body }) => (
          <Fragment key={heading}>
            <Text style={[styles.heading, { color: colors.foreground }]}>{heading}</Text>
            <Text style={[styles.paragraph, { color: colors.mutedForeground }]}>{body}</Text>
          </Fragment>
        ))}
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
