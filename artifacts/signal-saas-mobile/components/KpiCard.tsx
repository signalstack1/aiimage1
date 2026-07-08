import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { useColors } from "@/hooks/useColors";

interface Props {
  label: string;
  value: string;
  icon: React.ComponentProps<typeof Feather>["name"];
  tint: string;
}

export function KpiCard({ label, value, icon, tint }: Props) {
  const colors = useColors();
  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
      <View style={styles.row}>
        <Text style={[styles.label, { color: colors.mutedForeground }]} numberOfLines={1}>
          {label}
        </Text>
        <View style={[styles.iconWrap, { backgroundColor: `${tint}22` }]}>
          <Feather name={icon} size={14} color={tint} />
        </View>
      </View>
      <Text style={[styles.value, { color: colors.foreground }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexGrow: 1, flexBasis: "45%", borderWidth: 1, padding: 14, gap: 10 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  label: { fontSize: 11, fontWeight: "600", flex: 1 },
  iconWrap: { width: 26, height: 26, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  value: { fontSize: 24, fontWeight: "800" },
});
