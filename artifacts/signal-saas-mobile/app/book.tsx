import { useEffect, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";

import { useColors } from "@/hooks/useColors";
import { fetchServices, submitBooking, type ApiService } from "@/lib/api";

const EMPTY = { customer_name: "", email: "", phone: "", service: "", preferred_date: "", preferred_time: "", message: "" };

export default function BookScreen() {
  const colors = useColors();
  const router = useRouter();
  const [form, setForm] = useState(EMPTY);
  const [services, setServices] = useState<ApiService[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchServices().then(setServices);
  }, []);

  const set = (key: keyof typeof EMPTY) => (value: string) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async () => {
    if (!form.customer_name.trim()) {
      setError("Please enter your name.");
      return;
    }
    setError("");
    setSubmitting(true);
    const ok = await submitBooking(form);
    setSubmitting(false);
    if (ok) setSubmitted(true);
    else setError("Something went wrong. Please try again or contact us directly.");
  };

  return (
    <>
      <Stack.Screen options={{ title: "Book an appointment" }} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={styles.content}>
          {submitted ? (
            <View style={styles.successBlock}>
              <View style={[styles.successIcon, { backgroundColor: colors.primary }]}>
                <Feather name="check-circle" size={28} color={colors.primaryForeground} />
              </View>
              <Text style={[styles.successTitle, { color: colors.foreground }]}>Booking received!</Text>
              <Text style={[styles.successText, { color: colors.mutedForeground }]}>
                Thank you, {form.customer_name}. We'll be in touch shortly to confirm your appointment.
              </Text>
              <Pressable
                onPress={() => {
                  setForm(EMPTY);
                  setSubmitted(false);
                }}
                style={[styles.outlineButton, { borderColor: colors.border, borderRadius: colors.radius }]}
              >
                <Text style={{ color: colors.foreground, fontWeight: "600" }}>Submit another</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <Text style={[styles.title, { color: colors.foreground }]}>Book an appointment</Text>
              <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Fill in your details and we'll confirm your booking.</Text>

              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius * 1.5 }]}>
                <Field label="Your name *" value={form.customer_name} onChangeText={set("customer_name")} placeholder="Jane Smith" colors={colors} />
                <Field label="Email" value={form.email} onChangeText={set("email")} placeholder="jane@example.com" keyboardType="email-address" colors={colors} />
                <Field label="Phone" value={form.phone} onChangeText={set("phone")} placeholder="+44 7700 000000" keyboardType="phone-pad" colors={colors} />
                <Field label="Service needed" value={form.service} onChangeText={set("service")} placeholder="What can we help you with?" colors={colors} />
                <Field label="Preferred date" value={form.preferred_date} onChangeText={set("preferred_date")} placeholder="YYYY-MM-DD" colors={colors} />
                <Field label="Preferred time" value={form.preferred_time} onChangeText={set("preferred_time")} placeholder="HH:MM" colors={colors} />
                <Field label="Additional notes" value={form.message} onChangeText={set("message")} placeholder="Anything else we should know?" multiline colors={colors} />

                {!!error && <Text style={{ color: "#ef4444", fontSize: 12 }}>{error}</Text>}

                <Pressable
                  onPress={handleSubmit}
                  disabled={submitting}
                  style={[styles.submitButton, { backgroundColor: colors.primary, borderRadius: colors.radius, opacity: submitting ? 0.7 : 1 }]}
                >
                  {submitting ? <ActivityIndicator color={colors.primaryForeground} /> : (
                    <Text style={{ color: colors.primaryForeground, fontWeight: "700" }}>Request booking</Text>
                  )}
                </Pressable>
              </View>
            </>
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
  colors: ReturnType<typeof useColors>; multiline?: boolean; keyboardType?: "default" | "email-address" | "phone-pad";
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
          multiline && { height: 80, textAlignVertical: "top" },
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
  card: { borderWidth: 1, padding: 18, gap: 14 },
  input: { borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  submitButton: { height: 48, alignItems: "center", justifyContent: "center", marginTop: 4 },
  successBlock: { alignItems: "center", paddingVertical: 60, gap: 10 },
  successIcon: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", marginBottom: 6 },
  successTitle: { fontSize: 20, fontWeight: "800" },
  successText: { fontSize: 13, textAlign: "center", paddingHorizontal: 20 },
  outlineButton: { marginTop: 16, paddingHorizontal: 20, paddingVertical: 10, borderWidth: 1 },
});
