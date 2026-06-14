import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Speech from "expo-speech";

import { useLlama } from "@/hooks/useLlama";
import { useVoice } from "@/hooks/useVoice";

export type AssistantState =
  | "idle"
  | "listening"
  | "thinking"
  | "speaking"
  | "error"
  | "no-key";

export type BackendMode = "offline" | "groq";

export type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

const GROQ_KEY_STORAGE = "jarvis_groq_key";
const GROQ_MODEL = "llama-3.1-8b-instant";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const SYSTEM_PROMPT =
  "You are Jarvis, a sophisticated AI assistant. Be helpful and concise. Respond in plain spoken language only — no markdown, no bullet points, no symbols. Keep answers under 3 sentences unless more detail is requested.";

interface AssistantContextType {
  state: AssistantState;
  setState: (s: AssistantState) => void;
  messages: Message[];
  streamingText: string;
  errorMessage: string;
  groqKey: string;
  voiceSpeed: number;
  mode: BackendMode;
  llama: ReturnType<typeof useLlama>;
  voice: ReturnType<typeof useVoice>;
  setVoiceSpeed: (v: number) => void;
  saveGroqKey: (key: string) => void;
  sendMessage: (text: string) => Promise<void>;
  cancelResponse: () => void;
  clearHistory: () => void;
  dismissError: () => void;
  stopSpeaking: () => void;
}

const AssistantContext = createContext<AssistantContextType | null>(null);

export function AssistantProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AssistantState>("idle");
  const [messages, setMessages] = useState<Message[]>([]);
  const [streamingText, setStreamingText] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [groqKey, setGroqKeyState] = useState("");
  const [voiceSpeed, setVoiceSpeed] = useState(1.0);
  const abortRef = useRef<AbortController | null>(null);

  const llama = useLlama();
  const voice = useVoice();

  const mode: BackendMode =
    llama.status === "ready" ? "offline" : "groq";

  useEffect(() => {
    AsyncStorage.getItem(GROQ_KEY_STORAGE).then((k) => {
      if (k) setGroqKeyState(k);
      else if (llama.status !== "ready") setState("no-key");
    });
    llama.initialize();
  }, []);

  const saveGroqKey = useCallback(async (key: string) => {
    const trimmed = key.trim();
    if (trimmed) {
      await AsyncStorage.setItem(GROQ_KEY_STORAGE, trimmed);
      setGroqKeyState(trimmed);
      if (state === "no-key") setState("idle");
    } else {
      await AsyncStorage.removeItem(GROQ_KEY_STORAGE);
      setGroqKeyState("");
      if (llama.status !== "ready") setState("no-key");
    }
  }, [state, llama.status]);

  const stopSpeaking = useCallback(() => {
    Speech.stop();
    setState("idle");
  }, []);

  const speak = useCallback(
    (text: string) => {
      Speech.stop();
      setState("speaking");
      Speech.speak(text, {
        rate: voiceSpeed,
        language: "en-US",
        onDone: () => setState("idle"),
        onError: () => setState("idle"),
      });
    },
    [voiceSpeed]
  );

  const sendGroq = useCallback(
    async (
      text: string,
      history: Message[]
    ): Promise<string> => {
      const res = await fetch(GROQ_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${groqKey}`,
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            ...history.slice(-10).map((m) => ({
              role: m.role,
              content: m.content,
            })),
            { role: "user", content: text },
          ],
          stream: true,
          max_tokens: 256,
        }),
        signal: abortRef.current?.signal,
      });

      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Groq ${res.status}: ${body}`);
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") break;
          try {
            const parsed = JSON.parse(data);
            const token = parsed.choices?.[0]?.delta?.content ?? "";
            fullText += token;
            setStreamingText(fullText);
          } catch {
            // skip
          }
        }
      }

      return fullText;
    },
    [groqKey]
  );

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim()) return;
      if (mode === "groq" && !groqKey) {
        setState("no-key");
        return;
      }

      Speech.stop();
      const controller = new AbortController();
      abortRef.current = controller;

      const userMsg: Message = {
        id: Date.now().toString(),
        role: "user",
        content: text.trim(),
      };
      const updatedHistory = [...messages, userMsg];
      setMessages(updatedHistory);
      setState("thinking");
      setStreamingText("");

      try {
        let fullText = "";

        if (mode === "offline") {
          fullText = await llama.generate(
            updatedHistory.map((m) => ({ role: m.role, content: m.content })),
            (token) => {
              fullText += token;
              setStreamingText((prev) => prev + token);
            }
          );
        } else {
          fullText = await sendGroq(text.trim(), messages);
        }

        const assistantMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: fullText,
        };
        setMessages((prev) => [...prev, assistantMsg]);
        setStreamingText("");
        speak(fullText);
      } catch (err: unknown) {
        if ((err as Error).name === "AbortError") {
          setState("idle");
          return;
        }
        const msg = err instanceof Error ? err.message : "Something went wrong.";
        setErrorMessage(msg);
        setState("error");
        speak("I encountered an error. Please try again.");
      }
    },
    [messages, mode, groqKey, llama, sendGroq, speak]
  );

  const cancelResponse = useCallback(() => {
    abortRef.current?.abort();
    Speech.stop();
    setState("idle");
  }, []);

  const clearHistory = useCallback(() => {
    setMessages([]);
    setStreamingText("");
  }, []);

  const dismissError = useCallback(() => {
    setErrorMessage("");
    setState("idle");
  }, []);

  return (
    <AssistantContext.Provider
      value={{
        state,
        setState,
        messages,
        streamingText,
        errorMessage,
        groqKey,
        voiceSpeed,
        mode,
        llama,
        voice,
        setVoiceSpeed,
        saveGroqKey,
        sendMessage,
        cancelResponse,
        clearHistory,
        dismissError,
        stopSpeaking,
      }}
    >
      {children}
    </AssistantContext.Provider>
  );
}

export function useAssistant() {
  const ctx = useContext(AssistantContext);
  if (!ctx) throw new Error("useAssistant must be used within AssistantProvider");
  return ctx;
}
