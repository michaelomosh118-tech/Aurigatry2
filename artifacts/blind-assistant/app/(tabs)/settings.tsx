import React, { useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";

import { useAssistant } from "@/context/AssistantContext";
import colors from "@/constants/colors";

const c = colors.light;

const SPEED_OPTIONS = [
  { label: "0.75×", value: 0.75 },
  { label: "1×", value: 1.0 },
  { label: "1.25×", value: 1.25 },
  { label: "1.5×", value: 1.5 },
  { label: "2×", value: 2.0 },
];

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const assistant = useAssistant();
  const { llama } = assistant;
  const [keyInput, setKeyInput] = useState(assistant.groqKey);
  const [showKey, setShowKey] = useState(false);

  const handleSaveKey = () => {
    assistant.saveGroqKey(keyInput);
    Alert.alert("Saved", "Groq API key updated.");
  };

  const handleClearHistory = () => {
    Alert.alert("Clear History", "Delete all conversation history?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear",
        style: "destructive",
        onPress: () => {
          assistant.clearHistory();
          router.back();
        },
      },
    ]);
  };

  const handleDeleteModel = () => {
    Alert.alert(
      "Delete Model",
      "This will delete the downloaded AI model (~300 MB). You can download it again later.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: llama.deleteModel },
      ]
    );
  };

  const modelStatusColor = {
    ready: c.success,
    downloading: c.primary,
    loading: "#ffd700",
    "no-model": c.mutedForeground,
    unavailable: c.mutedForeground,
    error: c.destructive,
  }[llama.status];

  const modelStatusLabel = {
    ready: "Ready — Offline mode active",
    downloading: `Downloading… ${llama.downloadProgress}%`,
    loading: "Loading model into memory…",
    "no-model": "Not downloaded",
    unavailable: "Not available (web preview)",
    error: `Error: ${llama.errorMessage}`,
  }[llama.status];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{
        paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) + 4,
        paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 40,
      }}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Feather name="arrow-left" size={24} color={c.foreground} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Offline Model */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>OFFLINE MODEL</Text>
        <View style={styles.card}>
          <View style={styles.modelHeader}>
            <Feather name="cpu" size={18} color={c.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Qwen 2.5 · 0.5B (Q4)</Text>
              <Text style={[styles.modelStatus, { color: modelStatusColor }]}>
                {modelStatusLabel}
              </Text>
            </View>
            <Text style={styles.modelSize}>~300 MB</Text>
          </View>

          {llama.status === "downloading" && (
            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${llama.downloadProgress}%` },
                ]}
              />
            </View>
          )}

          {(llama.status === "no-model" || llama.status === "error") && (
            <TouchableOpacity
              onPress={llama.downloadModel}
              style={styles.downloadBtn}
              accessibilityLabel="Download offline model"
              accessibilityRole="button"
            >
              <Feather name="download" size={16} color={c.primaryForeground} />
              <Text style={styles.downloadBtnText}>Download Model</Text>
            </TouchableOpacity>
          )}

          {llama.status === "ready" && (
            <TouchableOpacity
              onPress={handleDeleteModel}
              style={styles.deleteModelBtn}
              accessibilityLabel="Delete offline model"
            >
              <Feather name="trash-2" size={14} color={c.destructive} />
              <Text style={styles.deleteModelText}>Remove Model</Text>
            </TouchableOpacity>
          )}

          <Text style={styles.modelNote}>
            Works on any Android 7+ device. Uses the phone's CPU — no GPU or
            internet required once downloaded.
          </Text>
        </View>
      </View>

      {/* Voice Speed */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>VOICE SPEED</Text>
        <View style={styles.card}>
          <View style={styles.speedRow}>
            {SPEED_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                onPress={() => assistant.setVoiceSpeed(opt.value)}
                style={[
                  styles.speedChip,
                  assistant.voiceSpeed === opt.value && styles.speedChipActive,
                ]}
                accessibilityLabel={`Set speech rate to ${opt.label}`}
                accessibilityRole="button"
              >
                <Text
                  style={[
                    styles.speedChipText,
                    assistant.voiceSpeed === opt.value &&
                      styles.speedChipTextActive,
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* Groq API Key */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>GROQ API KEY (CLOUD FALLBACK)</Text>
        <View style={styles.card}>
          <Text style={styles.cardSubtext}>
            Used when the offline model is not downloaded. Free at
            console.groq.com.
          </Text>
          <View style={styles.keyRow}>
            <TextInput
              value={keyInput}
              onChangeText={setKeyInput}
              secureTextEntry={!showKey}
              placeholder="gsk_..."
              placeholderTextColor={c.mutedForeground}
              style={styles.keyInput}
              accessibilityLabel="Groq API key"
            />
            <TouchableOpacity
              onPress={() => setShowKey((v) => !v)}
              style={styles.eyeBtn}
              accessibilityLabel={showKey ? "Hide key" : "Show key"}
            >
              <Feather
                name={showKey ? "eye-off" : "eye"}
                size={18}
                color={c.mutedForeground}
              />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            onPress={handleSaveKey}
            disabled={!keyInput.trim()}
            style={[styles.saveBtn, !keyInput.trim() && { opacity: 0.5 }]}
            accessibilityLabel="Save API key"
            accessibilityRole="button"
          >
            <Text style={styles.saveBtnText}>Save Key</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Build info */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>BUILD INFO</Text>
        <View style={styles.card}>
          <View style={styles.infoRow}>
            <Feather name="github" size={14} color={c.mutedForeground} />
            <Text style={styles.infoText}>
              Push to GitHub → Actions tab builds APK automatically
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Feather name="key" size={14} color={c.mutedForeground} />
            <Text style={styles.infoText}>
              Add EXPO_TOKEN to GitHub Secrets (Settings → Secrets)
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Feather name="download-cloud" size={14} color={c.mutedForeground} />
            <Text style={styles.infoText}>
              Download APK from expo.dev after build completes
            </Text>
          </View>
        </View>
      </View>

      {/* Danger zone */}
      <View style={styles.section}>
        <TouchableOpacity
          onPress={handleClearHistory}
          style={styles.clearBtn}
          accessibilityLabel="Clear all conversation history"
          accessibilityRole="button"
        >
          <Feather name="trash-2" size={18} color={c.destructive} />
          <Text style={styles.clearBtnText}>Clear Conversation History</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  backBtn: { padding: 8, marginLeft: -8 },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700" as const,
    color: c.foreground,
    fontFamily: "DM_Sans_700Bold",
  },
  section: { paddingHorizontal: 20, paddingTop: 26 },
  sectionLabel: {
    fontSize: 10,
    letterSpacing: 2.5,
    color: c.mutedForeground,
    fontFamily: "DM_Sans_500Medium",
    marginBottom: 10,
  },
  card: {
    backgroundColor: c.card,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: c.border,
    gap: 14,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: c.foreground,
    fontFamily: "DM_Sans_700Bold",
  },
  cardSubtext: {
    fontSize: 12,
    color: c.mutedForeground,
    fontFamily: "DM_Sans_400Regular",
    lineHeight: 18,
  },
  modelHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  modelStatus: {
    fontSize: 12,
    fontFamily: "DM_Sans_400Regular",
    marginTop: 2,
  },
  modelSize: {
    fontSize: 11,
    color: c.mutedForeground,
    fontFamily: "DM_Sans_400Regular",
  },
  progressBarBg: {
    height: 4,
    backgroundColor: c.border,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: c.primary,
    borderRadius: 2,
  },
  downloadBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: c.primary,
    borderRadius: 12,
    paddingVertical: 12,
  },
  downloadBtnText: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: c.primaryForeground,
    fontFamily: "DM_Sans_700Bold",
  },
  deleteModelBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
  },
  deleteModelText: {
    fontSize: 12,
    color: c.destructive,
    fontFamily: "DM_Sans_400Regular",
  },
  modelNote: {
    fontSize: 11,
    color: c.mutedForeground,
    fontFamily: "DM_Sans_400Regular",
    lineHeight: 17,
    opacity: 0.8,
  },
  speedRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  speedChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: c.secondary,
    borderWidth: 1,
    borderColor: c.border,
  },
  speedChipActive: {
    backgroundColor: c.primary,
    borderColor: c.primary,
  },
  speedChipText: {
    fontSize: 14,
    color: c.mutedForeground,
    fontFamily: "DM_Sans_500Medium",
  },
  speedChipTextActive: {
    color: c.primaryForeground,
    fontWeight: "700" as const,
  },
  keyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  keyInput: {
    flex: 1,
    backgroundColor: c.secondary,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: c.foreground,
    fontSize: 14,
    fontFamily: "DM_Sans_400Regular",
    borderWidth: 1,
    borderColor: c.border,
  },
  eyeBtn: { padding: 8 },
  saveBtn: {
    backgroundColor: c.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: c.primaryForeground,
    fontFamily: "DM_Sans_700Bold",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: c.secondaryForeground,
    fontFamily: "DM_Sans_400Regular",
    lineHeight: 18,
  },
  clearBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#1a0808",
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: "#3a1010",
  },
  clearBtnText: {
    fontSize: 15,
    color: c.destructive,
    fontFamily: "DM_Sans_500Medium",
  },
});
