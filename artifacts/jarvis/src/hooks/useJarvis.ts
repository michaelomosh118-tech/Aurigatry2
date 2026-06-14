import { useState, useEffect, useRef, useCallback } from "react";
import * as webllm from "@mlc-ai/web-llm";

export type AppState = "idle" | "loading" | "listening" | "thinking" | "speaking" | "error";

export type Message = {
  role: "user" | "assistant" | "system";
  content: string;
};

export type BackendType = "webgpu" | "groq" | null;

const SYSTEM_PROMPT =
  "You are Jarvis, a sophisticated AI assistant. Be helpful, concise, and slightly formal — like a butler with excellent knowledge. Keep responses under 3 sentences unless more detail is specifically requested.";

// q4f32_1 uses 32-bit accumulators but tiny weight tiles — workgroup storage stays ≤16KB.
// SmolLM2-135M is ~90MB download, works on mobile GPUs that reject all q4f16_1 models.
const WEBGPU_MODELS = [
  "Phi-3.5-mini-instruct-q4f16_1-MLC",      // Desktop: best quality
  "SmolLM2-360M-Instruct-q4f16_1-MLC",      // Mid-tier mobile
  "SmolLM2-135M-Instruct-q4f32_1-MLC",      // Any WebGPU device — ~90MB
];

const GROQ_API_KEY_STORAGE = "jarvis_groq_api_key";
const GROQ_MODEL = "llama-3.1-8b-instant";

export function useJarvis() {
  const [state, setState] = useState<AppState>("loading");
  const [progress, setProgress] = useState({ text: "Initializing...", progress: 0 });
  const [messages, setMessages] = useState<Message[]>([
    { role: "system", content: SYSTEM_PROMPT },
  ]);
  const [streamingResponse, setStreamingResponse] = useState("");
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [modelId, setModelId] = useState<string>("");
  const [backend, setBackend] = useState<BackendType>(null);
  const [groqKey, setGroqKeyState] = useState<string>(() =>
    localStorage.getItem(GROQ_API_KEY_STORAGE) ?? ""
  );

  const engineRef = useRef<webllm.MLCEngineInterface | null>(null);

  const saveGroqKey = useCallback((key: string) => {
    if (key) {
      localStorage.setItem(GROQ_API_KEY_STORAGE, key);
    } else {
      localStorage.removeItem(GROQ_API_KEY_STORAGE);
    }
    setGroqKeyState(key);
  }, []);

  // When a groq key is set while in webgpu mode (or vice versa), reinit
  const switchToGroq = useCallback((key: string) => {
    saveGroqKey(key);
    engineRef.current = null;
    setBackend("groq");
    setModelId(GROQ_MODEL);
    setState("idle");
  }, [saveGroqKey]);

  const switchToOffline = useCallback(() => {
    engineRef.current = null;
    setBackend(null);
    setModelId("");
    setState("loading");
  }, []);

  useEffect(() => {
    let mounted = true;

    async function tryWebGPU(): Promise<boolean> {
      const nav = navigator as Navigator & { gpu?: unknown };
      if (!nav.gpu) return false;

      for (const candidate of WEBGPU_MODELS) {
        if (!mounted) return false;
        try {
          if (mounted) {
            setModelId(candidate);
            setProgress({ text: `Loading ${candidate.replace("-MLC", "")}...`, progress: 0 });
          }
          const engine = await webllm.CreateMLCEngine(candidate, {
            initProgressCallback: (p) => {
              if (mounted) setProgress({ text: p.text, progress: p.progress });
            },
          });
          if (mounted) {
            engineRef.current = engine;
            setBackend("webgpu");
            setState("idle");
          }
          return true;
        } catch (err) {
          console.warn(`[Jarvis] ${candidate} failed:`, err instanceof Error ? err.message : err);
        }
      }
      return false;
    }

    async function initEngine() {
      // If groq key is stored, skip offline loading entirely
      const storedKey = localStorage.getItem(GROQ_API_KEY_STORAGE);
      if (storedKey) {
        if (mounted) {
          setGroqKeyState(storedKey);
          setModelId(GROQ_MODEL);
          setBackend("groq");
          setState("idle");
        }
        return;
      }

      const gpuOk = await tryWebGPU();
      if (!gpuOk && mounted) {
        setState("error");
        setErrorDetails(
          "WebGPU is not available on this device. Open Settings and enter a free Groq API key (console.groq.com) to use Jarvis in cloud mode."
        );
      }
    }

    if (!engineRef.current && state === "loading") {
      initEngine();
    }

    return () => {
      mounted = false;
    };
  }, [state]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (state !== "idle") return;

      setState("thinking");
      setStreamingResponse("");

      const userMessage: Message = { role: "user", content };
      const newMessages = [...messages, userMessage];
      setMessages(newMessages);

      const ctx = newMessages.slice(-10);

      try {
        let fullResponse = "";

        if (backend === "groq") {
          // Groq cloud path — streaming via fetch SSE
          setState("speaking");
          const key = localStorage.getItem(GROQ_API_KEY_STORAGE) ?? groqKey;
          const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${key}`,
            },
            body: JSON.stringify({
              model: GROQ_MODEL,
              messages: ctx.map((m) => ({ role: m.role, content: m.content })),
              stream: true,
              max_tokens: 512,
            }),
          });

          if (!res.ok) {
            const errText = await res.text();
            throw new Error(`Groq API error ${res.status}: ${errText}`);
          }

          const reader = res.body!.getReader();
          const decoder = new TextDecoder();
          let buffer = "";

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
                // skip malformed chunks
              }
            }
          }
        } else if (engineRef.current) {
          // WebGPU path
          setState("speaking");
          const stream = await engineRef.current.chat.completions.create({
            messages: ctx,
            stream: true,
            max_tokens: 512,
          });
          for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta?.content || "";
            fullResponse += delta;
            setStreamingResponse(fullResponse);
          }
        } else {
          throw new Error("No engine available.");
        }

        setMessages([...newMessages, { role: "assistant", content: fullResponse }]);
        setStreamingResponse("");
        setState("idle");
        return fullResponse;
      } catch (err: unknown) {
        console.error("Chat error:", err);
        setState("error");
        setErrorDetails(err instanceof Error ? err.message : "Failed to generate response.");
        return null;
      }
    },
    [messages, state, backend, groqKey]
  );

  const clearHistory = useCallback(() => {
    setMessages([{ role: "system", content: SYSTEM_PROMPT }]);
    setStreamingResponse("");
  }, []);

  return {
    state,
    setState,
    progress,
    messages: messages.filter((m) => m.role !== "system"),
    streamingResponse,
    errorDetails,
    sendMessage,
    clearHistory,
    modelId,
    backend,
    groqKey,
    switchToGroq,
    switchToOffline,
  };
}
