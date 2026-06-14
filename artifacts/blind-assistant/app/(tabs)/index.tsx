import React, { useEffect, useRef, useState } from "react";
import {
  FlatList,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";

import { useAssistant } from "@/context/AssistantContext";
import { Orb } from "@/components/Orb";
import colors from "@/constants/colors";

const c = colors.light;

function SetupScreen() {
  const insets = useSafeAreaInsets();
  const assistant = useAssistant();
  const [key, setKey] = useState("");

  return (
    <View
      style={[
        styles.setupContainer,
        {
          paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) + 24,
          paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 24,
        },
      ]}
    >
      <View style={styles.setupOrbWrapper}>
        <Orb state="idle" size={120} />
      </View>

      <Text style={styles.setupTitle}>J.A.R.V.I.S.</Text>
      <Text style={styles.setupSubtitle}>Your offline AI assistant</Text>

      <View style={styles.setupCard}>
        <View style={styles.setupRow}>
          <Feather name="zap" size={16} color={c.primary} />
          <Text style={styles.setupCardTitle}>Groq API Key</Text>
        </View>
        <Text style={styles.setupDesc}>
          Free at console.groq.com — no credit card. Used as cloud fallback
          while the offline model loads.
        </Text>
        <TextInput
          value={key}
          onChangeText={setKey}
          placeholder="gsk_..."
          placeholderTextColor={c.mutedForeground}
          style={styles.setupInput}
          secureTextEntry
          returnKeyType="done"
          onSubmitEditing={() => key.trim() && assistant.saveGroqKey(key)}
          accessibilityLabel="Enter your Groq API key"
          autoFocus
        />
        <TouchableOpacity
          onPress={() => key.trim() && assistant.saveGroqKey(key)}
          disabled={!key.trim()}
          style={[styles.setupBtn, !key.trim() && { opacity: 0.4 }]}
          accessibilityLabel="Activate Jarvis"
          accessibilityRole="button"
        >
          <Text style={styles.setupBtnText}>ACTIVATE JARVIS</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.setupNote}>
        A local AI model (~300 MB) can be downloaded in Settings for fully
        offline use.
      </Text>
    </View>
  );
}

export default function MainScreen() {
  const insets = useSafeAreaInsets();
  const assistant = useAssistant();
  const { voice } = assistant;
  const [textInput, setTextInput] = useState("");
  const [showInput, setShowInput] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const listRef = useRef<FlatList>(null);

  const dotOpacity1 = useSharedValue(1);
  const dotOpacity2 = useSharedValue(0.4);
  const dotOpacity3 = useSharedValue(0.2);

  useEffect(() => {
    if (assistant.state === "thinking") {
      dotOpacity1.value = withRepeat(
        withSequence(withTiming(1, { duration: 300 }), withTiming(0.2, { duration: 300 })),
        -1,
        true
      );
      dotOpacity2.value = withRepeat(
        withSequence(
          withTiming(0.2, { duration: 150 }),
          withTiming(1, { duration: 300 }),
          withTiming(0.2, { duration: 300 })
        ),
        -1,
        false
      );
      dotOpacity3.value = withRepeat(
        withSequence(
          withTiming(0.2, { duration: 300 }),
          withTiming(1, { duration: 300 }),
          withTiming(0.2, { duration: 300 })
        ),
        -1,
        false
      );
    } else {
      dotOpacity1.value = withTiming(0);
      dotOpacity2.value = withTiming(0);
      dotOpacity3.value = withTiming(0);
    }
  }, [assistant.state]);

  const dot1Style = useAnimatedStyle(() => ({ opacity: dotOpacity1.value }));
  const dot2Style = useAnimatedStyle(() => ({ opacity: dotOpacity2.value }));
  const dot3Style = useAnimatedStyle(() => ({ opacity: dotOpacity3.value }));

  const handleOrbPress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (assistant.state === "speaking") {
      assistant.stopSpeaking();
      return;
    }
    if (assistant.state === "thinking") {
      assistant.cancelResponse();
      return;
    }
    if (assistant.state === "listening" || voice.status === "listening") {
      await voice.stopListening();
      assistant.setState("idle");
      return;
    }

    // Try voice first, fall back to text input
    const started = await voice.startListening(async (transcript) => {
      if (transcript.trim()) {
        setShowInput(false);
        await assistant.sendMessage(transcript);
      }
    });

    if (started) {
      assistant.setState("listening");
    } else {
      // Voice not available — show text input
      setShowInput(true);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleSend = async () => {
    const text = textInput.trim();
    if (!text) return;
    setTextInput("");
    setShowInput(false);
    Keyboard.dismiss();
    await assistant.sendMessage(text);
  };

  if (assistant.state === "no-key") {
    return <SetupScreen />;
  }

  const displayState =
    voice.status === "listening" ? "listening" : assistant.state;

  const statusText = {
    idle: "TAP TO SPEAK",
    listening: "LISTENING...",
    thinking: "THINKING",
    speaking: "SPEAKING — TAP TO STOP",
    error: "ERROR",
    "no-key": "",
  }[displayState] ?? "TAP TO SPEAK";

  const statusColor =
    displayState === "listening"
      ? "#ff6b6b"
      : displayState === "speaking"
      ? c.primary
      : displayState === "thinking"
      ? "#ffd700"
      : displayState === "error"
      ? c.destructive
      : c.mutedForeground;

  const allBubbles = [
    ...assistant.messages,
    ...(assistant.streamingText
      ? [
          {
            id: "streaming",
            role: "assistant" as const,
            content: assistant.streamingText,
          },
        ]
      : []),
  ];

  const modeLabel =
    assistant.mode === "offline"
      ? "OFFLINE · Qwen 0.5B"
      : "CLOUD · Groq Llama 3.1";

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0),
          paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0),
        },
      ]}
    >
      {/* Grid background lines (web only — native uses background color) */}

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.onlineDot} />
          <Text style={styles.headerTitle}>J.A.R.V.I.S.</Text>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.modeLabel}>{modeLabel}</Text>
          <TouchableOpacity
            onPress={() => router.push("/(tabs)/settings")}
            style={styles.headerBtn}
            accessibilityLabel="Open settings"
            accessibilityRole="button"
          >
            <Feather name="settings" size={20} color={c.mutedForeground} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Conversation */}
      <FlatList
        ref={listRef}
        data={allBubbles}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        onContentSizeChange={() =>
          listRef.current?.scrollToEnd({ animated: true })
        }
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              Tap the orb and start speaking
            </Text>
            <Text style={styles.emptyHint}>
              Or tap the keyboard icon to type
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View
            style={[
              styles.bubble,
              item.role === "user" ? styles.userBubble : styles.assistantBubble,
            ]}
          >
            <Text
              style={[
                styles.bubbleText,
                item.role === "user"
                  ? styles.userBubbleText
                  : styles.assistantBubbleText,
              ]}
            >
              {item.content}
            </Text>
          </View>
        )}
      />

      {/* Controls area */}
      <View style={styles.controls}>
        {/* Status */}
        <View style={styles.statusRow}>
          <Text style={[styles.statusText, { color: statusColor }]}>
            {statusText}
          </Text>
          {assistant.state === "thinking" && (
            <View style={styles.dots}>
              <Animated.View style={[styles.dot, dot1Style]} />
              <Animated.View style={[styles.dot, dot2Style]} />
              <Animated.View style={[styles.dot, dot3Style]} />
            </View>
          )}
        </View>

        {/* Live transcript while listening */}
        {voice.transcript ? (
          <Text style={styles.transcript} numberOfLines={2}>
            "{voice.transcript}"
          </Text>
        ) : null}

        {/* Orb */}
        <Pressable
          onPress={handleOrbPress}
          accessibilityLabel={statusText}
          accessibilityRole="button"
          accessibilityHint="Double tap to activate voice assistant"
          style={styles.orbPressable}
        >
          <Orb state={displayState} size={160} />
        </Pressable>

        {/* Bottom row: keyboard toggle + clear */}
        <View style={styles.bottomRow}>
          <TouchableOpacity
            onPress={async () => {
              await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowInput((v) => !v);
              if (!showInput) setTimeout(() => inputRef.current?.focus(), 100);
            }}
            style={styles.iconBtn}
            accessibilityLabel="Toggle keyboard input"
            accessibilityRole="button"
          >
            <Feather
              name={showInput ? "mic" : "type"}
              size={22}
              color={showInput ? c.primary : c.mutedForeground}
            />
          </TouchableOpacity>

          {assistant.messages.length > 0 && (
            <TouchableOpacity
              onPress={assistant.clearHistory}
              style={styles.iconBtn}
              accessibilityLabel="Clear conversation"
            >
              <Feather name="trash-2" size={20} color={c.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>

        {/* Text input (togglable) */}
        {showInput && (
          <View style={styles.inputRow}>
            <TextInput
              ref={inputRef}
              value={textInput}
              onChangeText={setTextInput}
              onSubmitEditing={handleSend}
              placeholder="Type a message..."
              placeholderTextColor={c.mutedForeground}
              style={styles.input}
              returnKeyType="send"
              accessibilityLabel="Type your message"
            />
            <TouchableOpacity
              onPress={handleSend}
              disabled={!textInput.trim()}
              style={[styles.sendBtn, !textInput.trim() && { opacity: 0.4 }]}
              accessibilityLabel="Send message"
              accessibilityRole="button"
            >
              <Feather name="send" size={18} color={c.primaryForeground} />
            </TouchableOpacity>
          </View>
        )}

        {/* Error */}
        {assistant.state === "error" && (
          <TouchableOpacity
            onPress={assistant.dismissError}
            style={styles.errorRow}
            accessibilityLabel="Dismiss error"
          >
            <Feather name="alert-circle" size={14} color={c.destructive} />
            <Text style={styles.errorText} numberOfLines={2}>
              {assistant.errorMessage}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: c.primary,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: c.primary,
    fontFamily: "DM_Sans_700Bold",
    letterSpacing: 3,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  modeLabel: {
    fontSize: 9,
    color: c.mutedForeground,
    fontFamily: "DM_Sans_400Regular",
    letterSpacing: 1,
  },
  headerBtn: {
    padding: 6,
  },
  listContent: {
    flexGrow: 1,
    padding: 16,
    gap: 10,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 40,
    gap: 8,
  },
  emptyText: {
    color: c.mutedForeground,
    fontSize: 15,
    fontFamily: "DM_Sans_400Regular",
    textAlign: "center",
  },
  emptyHint: {
    color: c.mutedForeground,
    fontSize: 12,
    fontFamily: "DM_Sans_400Regular",
    opacity: 0.6,
  },
  bubble: {
    maxWidth: "82%",
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 18,
  },
  userBubble: {
    alignSelf: "flex-end",
    backgroundColor: c.primary,
    borderBottomRightRadius: 5,
  },
  assistantBubble: {
    alignSelf: "flex-start",
    backgroundColor: c.secondary,
    borderBottomLeftRadius: 5,
    borderWidth: 1,
    borderColor: c.border,
  },
  bubbleText: {
    fontSize: 15,
    lineHeight: 22,
    fontFamily: "DM_Sans_400Regular",
  },
  userBubbleText: {
    color: c.primaryForeground,
  },
  assistantBubbleText: {
    color: c.foreground,
  },
  controls: {
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 16,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: c.border,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    height: 20,
  },
  statusText: {
    fontSize: 10,
    letterSpacing: 2.5,
    fontFamily: "DM_Sans_500Medium",
  },
  dots: {
    flexDirection: "row",
    gap: 4,
    alignItems: "center",
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#ffd700",
  },
  transcript: {
    color: c.mutedForeground,
    fontSize: 13,
    fontFamily: "DM_Sans_400Regular",
    fontStyle: "italic",
    textAlign: "center",
    paddingHorizontal: 20,
    minHeight: 18,
  },
  orbPressable: {
    marginVertical: 4,
  },
  bottomRow: {
    flexDirection: "row",
    gap: 24,
    alignItems: "center",
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: c.secondary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: c.border,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    width: "100%",
  },
  input: {
    flex: 1,
    backgroundColor: c.secondary,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 11,
    color: c.foreground,
    fontSize: 15,
    fontFamily: "DM_Sans_400Regular",
    borderWidth: 1,
    borderColor: c.border,
  },
  sendBtn: {
    backgroundColor: c.primary,
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#1a0808",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    width: "100%",
    borderWidth: 1,
    borderColor: "#3a1010",
  },
  errorText: {
    color: c.destructive,
    fontSize: 12,
    flex: 1,
    fontFamily: "DM_Sans_400Regular",
  },
  setupContainer: {
    flex: 1,
    backgroundColor: c.background,
    alignItems: "center",
    paddingHorizontal: 28,
    gap: 20,
  },
  setupOrbWrapper: {
    marginTop: 16,
    marginBottom: 4,
  },
  setupTitle: {
    fontSize: 34,
    fontWeight: "700" as const,
    color: c.primary,
    fontFamily: "DM_Sans_700Bold",
    letterSpacing: 6,
  },
  setupSubtitle: {
    fontSize: 14,
    color: c.mutedForeground,
    fontFamily: "DM_Sans_400Regular",
    letterSpacing: 1,
  },
  setupCard: {
    width: "100%",
    backgroundColor: c.card,
    borderRadius: 20,
    padding: 22,
    gap: 14,
    borderWidth: 1,
    borderColor: c.border,
  },
  setupRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  setupCardTitle: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: c.foreground,
    fontFamily: "DM_Sans_700Bold",
  },
  setupDesc: {
    fontSize: 13,
    color: c.mutedForeground,
    fontFamily: "DM_Sans_400Regular",
    lineHeight: 19,
  },
  setupInput: {
    backgroundColor: c.secondary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
    color: c.foreground,
    fontSize: 15,
    fontFamily: "DM_Sans_400Regular",
    borderWidth: 1,
    borderColor: c.border,
  },
  setupBtn: {
    backgroundColor: c.primary,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
  },
  setupBtnText: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: c.primaryForeground,
    fontFamily: "DM_Sans_700Bold",
    letterSpacing: 2.5,
  },
  setupNote: {
    fontSize: 12,
    color: c.mutedForeground,
    fontFamily: "DM_Sans_400Regular",
    textAlign: "center",
    paddingHorizontal: 20,
    lineHeight: 18,
    opacity: 0.7,
  },
});
