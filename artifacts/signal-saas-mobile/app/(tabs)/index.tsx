import { useEffect, useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Linking } from "react-native";

import { PlanCard } from "@/components/PlanCard";
import { APP_CONFIG } from "@/config/app";
import { useColors } from "@/hooks/useColors";
import { fetchPlans, trackEvent, type ApiPlan } from "@/lib/api";

const FALLBACK_PLANS: ApiPlan[] = [
  { id: "plan-starter", name: "Starter", description: "Get your edge in the market", price_cents: 2900, interval: "monthly", is_active: true },
  { id: "plan-pro", name: "Pro", description: "For serious, full-time traders", price_cents: 7900, interval: "monthly", is_active: true },
  { id: "plan-lifetime", name: "Lifetime VIP", description: "Pay once, profit forever", price_cents: 49900, interval: "lifetime", is_active: true },
];

function getPlanMeta(name: string) {
  return APP_CONFIG.planFeatures[name.toLowerCase()] ?? { features: [], highlight: false };
}

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [plans, setPlans] = useState<ApiPlan[]>([]);
  const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<string | null>(null);

  useEffect(() => {
    fetchPlans().then((data) => {
      if (data.length > 0) setPlans(data);
    });
  }, []);

  const displayPlans = plans.length > 0 ? plans : FALLBACK_PLANS;

  const handlePlanPress = async (plan: ApiPlan) => {
    trackEvent("purchase_click", plan.id, plan.name);
    const hasVariants = (plan.product_variants?.length ?? 0) > 0;
    if (hasVariants) {
      router.push(`/product/${plan.id}`);
      return;
    }
    if (plan.payment_url) {
      setLoadingPlanId(plan.id);
      await Linking.openURL(plan.payment_url).catch(() => {});
      setLoadingPlanId(null);
    }
  };

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom + 24;

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={{ paddingTop: topInset, paddingBottom: bottomPad }}>
      <View style={styles.header}>
        <View style={[styles.logoBadge, { backgroundColor: colors.primary }]}>
          <Feather name="trending-up" size={16} color={colors.primaryForeground} />
        </View>
        <Text style={[styles.appName, { color: colors.foreground }]}>{APP_CONFIG.appName}</Text>
      </View>

      <View style={styles.hero}>
        <View style={[styles.badgePill, { borderColor: `${colors.primary}55`, backgroundColor: `${colors.primary}14` }]}>
          <Feather name="zap" size={11} color={colors.primary} />
          <Text style={[styles.badgePillText, { color: colors.primary }]} numberOfLines={1}>
            {APP_CONFIG.hero.badge}
          </Text>
        </View>
        <Text style={[styles.heroTitle, { color: colors.foreground }]}>
          {APP_CONFIG.hero.headlinePlain} <Text style={{ color: colors.primary }}>{APP_CONFIG.hero.headlineGradient}</Text>
        </Text>
        <Text style={[styles.heroSubtext, { color: colors.mutedForeground }]}>{APP_CONFIG.hero.subtext}</Text>
      </View>

      <View style={[styles.statsRow, { borderColor: colors.border, backgroundColor: colors.card }]}>
        {APP_CONFIG.stats.map((s) => (
          <View key={s.label} style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.primary }]}>{s.value}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{s.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{APP_CONFIG.sampleSectionTitle}</Text>
        <Text style={[styles.sectionSubtext, { color: colors.mutedForeground }]}>{APP_CONFIG.sampleSectionSubtext}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingTop: 14 }}>
          {APP_CONFIG.sampleItems.map((s) => (
            <View key={s.asset} style={[styles.sampleCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius * 2 }]}>
              <View style={styles.sampleHeader}>
                <Text style={[styles.sampleAsset, { color: colors.foreground }]}>{s.asset}</Text>
                <View style={[styles.dirBadge, { backgroundColor: s.dir === "LONG" ? "#10b98126" : "#ef444426" }]}>
                  <Text style={{ color: s.dir === "LONG" ? "#10b981" : "#ef4444", fontSize: 10, fontWeight: "700" }}>{s.dir}</Text>
                </View>
              </View>
              <View style={styles.sampleRow}>
                <Text style={[styles.sampleLabel, { color: colors.mutedForeground }]}>Entry</Text>
                <Text style={[styles.sampleMono, { color: colors.foreground }]}>{s.entry}</Text>
              </View>
              {s.tp.slice(0, 2).map((t, i) => (
                <View key={i} style={styles.sampleRow}>
                  <Text style={[styles.sampleLabel, { color: colors.mutedForeground }]}>TP{i + 1}</Text>
                  <Text style={[styles.sampleMono, { color: "#10b981" }]}>{t}</Text>
                </View>
              ))}
              <View style={[styles.sampleFooter, { borderTopColor: colors.border }]}>
                <Text style={[styles.sampleLabel, { color: colors.mutedForeground }]}>Result</Text>
                <Text style={{ color: "#10b981", fontWeight: "700", fontSize: 12 }}>{s.result}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{APP_CONFIG.pricingTitle}</Text>
        <Text style={[styles.sectionSubtext, { color: colors.mutedForeground }]}>{APP_CONFIG.pricingSubtext}</Text>
        <View style={{ gap: 16, marginTop: 16 }}>
          {displayPlans.map((plan) => {
            const meta = getPlanMeta(plan.name);
            return (
              <PlanCard
                key={plan.id}
                plan={plan}
                features={meta.features}
                highlight={meta.highlight}
                loading={loadingPlanId === plan.id}
                onPress={() => handlePlanPress(plan)}
              />
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Frequently asked questions</Text>
        <View style={{ gap: 8, marginTop: 14 }}>
          {APP_CONFIG.faqs.map((f) => {
            const open = openFaq === f.q;
            return (
              <View key={f.q} style={[styles.faqItem, { borderColor: colors.border, borderRadius: colors.radius }]}>
                <Pressable onPress={() => setOpenFaq(open ? null : f.q)} style={styles.faqHeader}>
                  <Text style={[styles.faqQ, { color: colors.foreground }]}>{f.q}</Text>
                  <Feather name={open ? "chevron-up" : "chevron-down"} size={16} color={colors.mutedForeground} />
                </Pressable>
                {open && <Text style={[styles.faqA, { color: colors.mutedForeground, borderTopColor: colors.border }]}>{f.a}</Text>}
              </View>
            );
          })}
        </View>
      </View>

      <View style={[styles.moreLinksRow, { borderTopColor: colors.border }]}>
        {[
          { label: "Services", href: "/services" as const },
          { label: "Gallery", href: "/gallery" as const },
          { label: "Contact", href: "/contact" as const },
        ].map((link) => (
          <Pressable key={link.href} onPress={() => router.push(link.href)} style={styles.moreLink}>
            <Text style={[styles.moreLinkText, { color: colors.mutedForeground }]}>{link.label}</Text>
          </Pressable>
        ))}
      </View>

      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <View style={styles.legalLinksRow}>
          {[
            { label: "Disclaimer", href: "/legal/disclaimer" as const },
            { label: "Terms", href: "/legal/terms" as const },
            { label: "Privacy", href: "/legal/privacy" as const },
          ].map((link) => (
            <Pressable key={link.href} onPress={() => router.push(link.href)}>
              <Text style={[styles.footerLinkText, { color: colors.mutedForeground }]}>{link.label}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={[styles.footerText, { color: colors.mutedForeground }]}>
          © {new Date().getFullYear()} {APP_CONFIG.legalName}. All rights reserved.
        </Text>
        <Text style={[styles.footerText, { color: colors.mutedForeground }]}>Past performance is not indicative of future results.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 20, paddingBottom: 8 },
  logoBadge: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  appName: { fontSize: 17, fontWeight: "800" },
  hero: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 24, gap: 14 },
  badgePill: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, maxWidth: "100%" },
  badgePillText: { fontSize: 11, fontWeight: "600" },
  heroTitle: { fontSize: 32, fontWeight: "800", lineHeight: 38 },
  heroSubtext: { fontSize: 15, lineHeight: 22 },
  statsRow: { flexDirection: "row", flexWrap: "wrap", borderTopWidth: 1, borderBottomWidth: 1, paddingVertical: 20, paddingHorizontal: 12 },
  statItem: { width: "50%", alignItems: "center", marginBottom: 12, gap: 2 },
  statValue: { fontSize: 20, fontWeight: "800" },
  statLabel: { fontSize: 11, textAlign: "center" },
  section: { paddingHorizontal: 20, paddingVertical: 28 },
  sectionTitle: { fontSize: 22, fontWeight: "800" },
  sectionSubtext: { fontSize: 13, marginTop: 6, lineHeight: 19 },
  sampleCard: { width: 220, borderWidth: 1, padding: 16, gap: 8 },
  sampleHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  sampleAsset: { fontSize: 16, fontWeight: "700" },
  dirBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  sampleRow: { flexDirection: "row", justifyContent: "space-between" },
  sampleLabel: { fontSize: 12 },
  sampleMono: { fontSize: 12, fontWeight: "600" },
  sampleFooter: { flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, paddingTop: 8, marginTop: 4 },
  faqItem: { borderWidth: 1, overflow: "hidden" },
  faqHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 14 },
  faqQ: { fontSize: 13, fontWeight: "600", flex: 1, marginRight: 8 },
  faqA: { fontSize: 13, lineHeight: 19, padding: 14, paddingTop: 0, borderTopWidth: 1, marginTop: 4 },
  moreLinksRow: { flexDirection: "row", justifyContent: "center", gap: 24, borderTopWidth: 1, paddingVertical: 18 },
  moreLink: { paddingVertical: 4 },
  moreLinkText: { fontSize: 13, fontWeight: "600" },
  footer: { borderTopWidth: 1, padding: 20, alignItems: "center", gap: 8 },
  legalLinksRow: { flexDirection: "row", gap: 16, marginBottom: 4 },
  footerLinkText: { fontSize: 11, textDecorationLine: "underline" },
  footerText: { fontSize: 11, textAlign: "center" },
});
