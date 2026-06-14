import { useState, useCallback } from "react";

export type AppState = "idle" | "thinking" | "speaking" | "listening" | "error";

export type Message = {
  role: "user" | "assistant" | "system";
  content: string;
};

const SYSTEM_PROMPT =
  "You are Jarvis, a sophisticated AI assistant. Be helpful, concise, and slightly formal — like a butler with excellent knowledge. Keep responses under 3 sentences unless more detail is specifically requested.";

const GROQ_KEY_STORAGE = "jarvis_groq_api_key";
const GROQ_MODEL = "llama-3.1-8b-instant";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

export function useJarvis() {
  const [state, setState] = useState<AppState>("idle");
  const [messages, setMessages] = useState<Message[]>([
    { role: "system", content: SYSTEM_PROMPT },
  ]);
  const [streamingResponse, setStreamingResponse] = useState("");
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [groqKey, setGroqKeyState] = useState<string>(
    () => localStorage.getItem(GROQ_KEY_STORAGE) ?? ""
  );

  const saveGroqKey = useCallback((key: string) => {
    const trimmed = key.trim();
    if (trimmed) {
      localStorage.setItem(GROQ_KEY_STORAGE, trimmed);
    } else {
      localStorage.removeItem(GROQ_KEY_STORAGE);
    }
    setGroqKeyState(trimmed);
  }, []);

  const sendMessage = useCallback(
    async (content: string) => {
      if (state !== "idle" || !groqKey) return;

      setState("thinking");
      setStreamingResponse("");
      setErrorDetails(null);

      const userMessage: Message = { role: "user", content };
      const newMessages = [...messages, userMessage];
      setMessages(newMessages);

      try {
        const res = await fetch(GROQ_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${groqKey}`,
          },
          body: JSON.stringify({
            model: GROQ_MODEL,
            messages: newMessages.slice(-12).map((m) => ({
              role: m.role,
              content: m.content,
            })),
            stream: true,
            max_tokens: 512,
          }),
        });

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`Groq error ${res.status}: ${errText}`);
        }

        setState("speaking");

        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let fullResponse = "";

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
              const delta = parsed.choices?.[0]?.delta?.content ?? "";
              fullResponse += delta;
              setStreamingResponse(fullResponse);
            } catch {
              // skip malformed SSE chunks
            }
          }
        }

        setMessages([...newMessages, { role: "assistant", content: fullResponse }]);
        setStreamingResponse("");
        setState("idle");
        return fullResponse;
      } catch (err: unknown) {
        console.error("[Jarvis] chat error:", err);
        const msg = err instanceof Error ? err.message : "Failed to reach Groq API.";
        setErrorDetails(msg);
        setState("error");
        return null;
      }
    },
    [messages, state, groqKey]
  );

  const clearHistory = useCallback(() => {
    setMessages([{ role: "system", content: SYSTEM_PROMPT }]);
    setStreamingResponse("");
    setErrorDetails(null);
  }, []);

  const dismissError = useCallback(() => {
    setErrorDetails(null);
    setState("idle");
  }, []);

  return {
    state,
    setState,
    messages: messages.filter((m) => m.role !== "system"),
    streamingResponse,
    errorDetails,
    sendMessage,
    clearHistory,
    dismissError,
    groqKey,
    saveGroqKey,
    modelId: GROQ_MODEL,
  };
}
