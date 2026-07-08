import { useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Stack } from "expo-router";

import { APP_CONFIG } from "@/config/app";
import { useColors } from "@/hooks/useColors";
import { submitContactMessage } from "@/lib/api";

const EMPTY = { name: "", email: "", subject: "", body: "" };

export default function ContactScreen() {
  const colors = useColors();
  const [form, setForm] = useState(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const set = (key: keyof typeof EMPTY) => (value: string) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async () => {
    if (!form.email.trim() || !form.body.trim()) {
      setError("Email and message are required.");
      return;
    }
    setError("");
    setSubmitting(true);
    const ok = await submitContactMessage(form);
    setSubmitting(false);
    if (ok) setSubmitted(true);
    else setError("Something went wrong. Please try again or email us directly.");
  };

  return (
    <>
      <Stack.Screen options={{ title: "Get in touch" }} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={styles.content}>
          <Text style={[styles.title, { color: colors.foreground }]}>Get in touch</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>We'd love to hear from you.</Text>

          <Pressable onPress={() => Linking.openURL(`mailto:${APP_CONFIG.supportEmail}`)} style={styles.contactRow}>
            <View style={[styles.contactIcon, { backgroundColor: `${colors.primary}18` }]}>
              <Feather name="mail" size={16} color={colors.primary} />
            </View>
            <View>
              <Text style={{ fontSize: 12, fontWeight: "600", color: colors.foreground }}>Email</Text>
              <Text style={{ fontSize: 12, color: colors.mutedForeground }}>{APP_CONFIG.supportEmail}</Text>
            </View>
          </Pressable>

          {submitted ? (
            <View style={styles.successBlock}>
              <View style={[styles.successIcon, { backgroundColor: colors.primary }]}>
                <Feather name="check-circle" size={28} color={colors.primaryForeground} />
              </View>
              <Text style={[styles.successTitle, { color: colors.foreground }]}>Message sent!</Text>
              <Text style={[styles.successText, { color: colors.mutedForeground }]}>
                Thanks for reaching out. We'll reply to {form.email} as soon as possible.
              </Text>
              <Pressable
                onPress={() => {
                  setForm(EMPTY);
                  setSubmitted(false);
                }}
                style={[styles.outlineButton, { borderColor: colors.border, borderRadius: colors.radius }]}
              >
                <Text style={{ color: colors.foreground, fontWeight: "600" }}>Send another</Text>
              </Pressable>
            </View>
          ) : (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius * 1.5 }]}>
              <Field label="Name" value={form.name} onChangeText={set("name")} placeholder="Jane Smith" colors={colors} />
              <Field label="Email *" value={form.email} onChangeText={set("email")} placeholder="jane@example.com" keyboardType="email-address" colors={colors} />
              <Field label="Subject" value={form.subject} onChangeText={set("subject")} placeholder="How can we help?" colors={colors} />
              <Field label="Message *" value={form.body} onChangeText={set("body")} placeholder="Tell us about your project…" multiline colors={colors} />

              {!!error && <Text style={{ color: "#ef4444", fontSize: 12 }}>{error}</Text>}

              <Pressable
                onPress={handleSubmit}
                disabled={submitting}
                style={[styles.submitButton, { backgroundColor: colors.primary, borderRadius: colors.radius, opacity: submitting ? 0.7 : 1 }]}
              >
                {submitting ? <ActivityIndicator color={colors.primaryForeground} /> : (
                  <Text style={{ color: colors.primaryForeground, fontWeight: "700" }}>Send message</Text>
                )}
              </Pressable>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

function Field({
  label, value, onChangeText, placeholder, colors, multiline, keyboardType,
}: {
  label: string; value: string; onChangeText: (v: string) => void; placeholder: string;
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>; multiline?: boolean; keyboardType?: "default" | "email-address";
}) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontSize: 12, fontWeight: "600", color: colors.foreground }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
        multiline={multiline}
        keyboardType={keyboardType}
        style={[
          styles.input,
          multiline && { height: 100, textAlignVertical: "top" },
          { borderColor: colors.border, color: colors.foreground, borderRadius: colors.radius, backgroundColor: colors.background },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 60 },
  title: { fontSize: 24, fontWeight: "800", textAlign: "center" },
  subtitle: { fontSize: 13, textAlign: "center", marginTop: 6, marginBottom: 20 },
  contactRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 20 },
  contactIcon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  card: { borderWidth: 1, padding: 18, gap: 14 },
  input: { borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  submitButton: { height: 48, alignItems: "center", justifyContent: "center", marginTop: 4 },
  successBlock: { alignItems: "center", paddingVertical: 40, gap: 10 },
  successIcon: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", marginBottom: 6 },
  successTitle: { fontSize: 20, fontWeight: "800" },
  successText: { fontSize: 13, textAlign: "center", paddingHorizontal: 20 },
  outlineButton: { marginTop: 16, paddingHorizontal: 20, paddingVertical: 10, borderWidth: 1 },
});
