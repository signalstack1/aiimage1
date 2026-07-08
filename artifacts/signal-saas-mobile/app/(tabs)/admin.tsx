import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { KpiCard } from "@/components/KpiCard";
import { APP_CONFIG } from "@/config/app";
import { useColors } from "@/hooks/useColors";
import { useAdminAuth } from "@/lib/admin-auth";
import { fetchOverview, type OverviewData } from "@/lib/api";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function AdminLoginForm() {
  const colors = useColors();
  const { login } = useAdminAuth();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!password) return;
    setLoading(true);
    setError("");
    const result = await login(password);
    if (!result.success) setError(result.error || "Invalid password");
    setLoading(false);
  };

  return (
    <View style={[styles.loginContainer, { backgroundColor: colors.background }]}>
      <View style={[styles.loginIcon, { backgroundColor: colors.primary }]}>
        <Feather name="trending-up" size={24} color={colors.primaryForeground} />
      </View>
      <Text style={[styles.loginTitle, { color: colors.foreground }]}>{APP_CONFIG.appName} Admin</Text>
      <Text style={[styles.loginSubtitle, { color: colors.mutedForeground }]}>Enter your admin password to continue</Text>

      <View style={[styles.loginCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius * 1.5 }]}>
        <Text style={{ fontSize: 12, color: colors.mutedForeground, marginBottom: 6 }}>Password</Text>
        <View style={[styles.inputWrap, { borderColor: colors.border, borderRadius: colors.radius }]}>
          <Feather name="lock" size={16} color={colors.mutedForeground} />
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="Admin password"
            placeholderTextColor={colors.mutedForeground}
            style={[styles.input, { color: colors.foreground }]}
            onSubmitEditing={handleSubmit}
          />
        </View>
        {!!error && <Text style={{ color: colors.destructive, fontSize: 12, marginTop: 8 }}>{error}</Text>}
        <Pressable
          onPress={handleSubmit}
          disabled={loading}
          style={[styles.loginButton, { backgroundColor: colors.primary, borderRadius: colors.radius, opacity: loading ? 0.6 : 1 }]}
        >
          {loading ? <ActivityIndicator color={colors.primaryForeground} /> : <Text style={{ color: colors.primaryForeground, fontWeight: "700" }}>Sign in</Text>}
        </Pressable>
      </View>
    </View>
  );
}

function AdminDashboard() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { token, logout } = useAdminAuth();
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    if (!token) return;
    setLoading(true);
    fetchOverview(token).then(setData).finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const modules = APP_CONFIG.adminModules;
  const adminCfg = APP_CONFIG.admin;
  const kpis = data?.kpis;

  const topInset = Platform.OS === "web" ? 67 : insets.top;

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ paddingTop: topInset + 12, paddingBottom: insets.bottom + 24, paddingHorizontal: 20, gap: 20 }}
    >
      <View style={styles.dashHeader}>
        <View>
          <Text style={[styles.dashTitle, { color: colors.foreground }]}>Overview</Text>
          <Text style={{ fontSize: 12, color: colors.mutedForeground, marginTop: 2 }}>{APP_CONFIG.appName} performance</Text>
        </View>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Pressable onPress={load} style={[styles.iconButton, { borderColor: colors.border }]}>
            <Feather name="refresh-cw" size={15} color={colors.foreground} />
          </Pressable>
          <Pressable onPress={logout} style={[styles.iconButton, { borderColor: colors.border }]}>
            <Feather name="log-out" size={15} color={colors.foreground} />
          </Pressable>
        </View>
      </View>

      <View style={styles.kpiGrid}>
        {modules.products !== false && (
          <KpiCard label={`${adminCfg.products.plural} Live`} value={String(kpis?.productsLive ?? 0)} icon="package" tint={colors.primary} />
        )}
        {modules.customers !== false && (
          <KpiCard label={`Total ${adminCfg.customers.plural}`} value={String(kpis?.totalMembers ?? 0)} icon="users" tint="#8b5cf6" />
        )}
        {kpis?.monthlyRevenueCents !== undefined && (
          <KpiCard label="Monthly Revenue" value={`$${((kpis.monthlyRevenueCents ?? 0) / 100).toFixed(0)}`} icon="dollar-sign" tint="#f59e0b" />
        )}
        {kpis?.totalRevenueCents !== undefined && (
          <KpiCard label="Total Revenue" value={`$${((kpis.totalRevenueCents ?? 0) / 100).toFixed(0)}`} icon="trending-up" tint="#10b981" />
        )}
      </View>

      {data && data.topProducts.length > 0 && (
        <View style={[styles.panel, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius * 1.5 }]}>
          <Text style={[styles.panelTitle, { color: colors.foreground }]}>Top Performing Products</Text>
          {data.topProducts.map((p) => (
            <View key={p.planName} style={[styles.tableRow, { borderTopColor: colors.border }]}>
              <Text style={{ color: colors.foreground, fontSize: 13, flex: 1 }} numberOfLines={1}>
                {p.planName}
              </Text>
              <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>{p.views} views</Text>
            </View>
          ))}
        </View>
      )}

      <View style={[styles.panel, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius * 1.5 }]}>
        <Text style={[styles.panelTitle, { color: colors.foreground }]}>Recent Activity</Text>
        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: 20 }} />
        ) : !data || data.recentActivity.length === 0 ? (
          <Text style={{ color: colors.mutedForeground, fontSize: 13, paddingVertical: 16, textAlign: "center" }}>No activity recorded yet.</Text>
        ) : (
          data.recentActivity.slice(0, 6).map((item) => (
            <View key={item.id} style={[styles.activityRow, { borderTopColor: colors.border }]}>
              <View style={[styles.activityIcon, { backgroundColor: colors.accent }]}>
                <Feather name="user-plus" size={13} color={colors.foreground} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.foreground, fontSize: 13 }} numberOfLines={1}>
                  {item.label}
                </Text>
              </View>
              <Text style={{ color: colors.mutedForeground, fontSize: 11 }}>{timeAgo(item.createdAt)}</Text>
            </View>
          ))
        )}
      </View>

      <View style={{ flexDirection: "row", gap: 10 }}>
        {modules.products !== false && (
          <Pressable onPress={() => router.push("/admin/products")} style={[styles.navPill, { borderColor: colors.border }]}>
            <Feather name="package" size={14} color={colors.foreground} />
            <Text style={{ color: colors.foreground, fontSize: 12, fontWeight: "600" }}>Products</Text>
          </Pressable>
        )}
        {modules.customers !== false && (
          <Pressable onPress={() => router.push("/admin/customers")} style={[styles.navPill, { borderColor: colors.border }]}>
            <Feather name="users" size={14} color={colors.foreground} />
            <Text style={{ color: colors.foreground, fontSize: 12, fontWeight: "600" }}>Customers</Text>
          </Pressable>
        )}
        {modules.access !== false && (
          <Pressable onPress={() => router.push("/admin/access")} style={[styles.navPill, { borderColor: colors.border }]}>
            <Feather name="key" size={14} color={colors.foreground} />
            <Text style={{ color: colors.foreground, fontSize: 12, fontWeight: "600" }}>Access</Text>
          </Pressable>
        )}
      </View>
    </ScrollView>
  );
}

export default function AdminScreen() {
  const { token, isLoading } = useAdminAuth();
  const colors = useColors();

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return token ? <AdminDashboard /> : <AdminLoginForm />;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  loginContainer: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  loginIcon: { width: 52, height: 52, borderRadius: 16, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  loginTitle: { fontSize: 20, fontWeight: "800" },
  loginSubtitle: { fontSize: 13, marginTop: 4, marginBottom: 24, textAlign: "center" },
  loginCard: { width: "100%", borderWidth: 1, padding: 20 },
  inputWrap: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, paddingHorizontal: 12, height: 46 },
  input: { flex: 1, fontSize: 14 },
  loginButton: { height: 46, alignItems: "center", justifyContent: "center", marginTop: 16 },
  dashHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  dashTitle: { fontSize: 22, fontWeight: "800" },
  iconButton: { width: 34, height: 34, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  kpiGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  panel: { borderWidth: 1, padding: 16, gap: 4 },
  panelTitle: { fontSize: 14, fontWeight: "700", marginBottom: 8 },
  tableRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10, borderTopWidth: 1 },
  activityRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, borderTopWidth: 1 },
  activityIcon: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  navPill: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, height: 42, borderWidth: 1, borderRadius: 10 },
});
