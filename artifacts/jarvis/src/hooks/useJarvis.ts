import { useState, useEffect, useRef, useCallback } from "react";
import * as webllm from "@mlc-ai/web-llm";

export type AppState = "idle" | "loading" | "listening" | "thinking" | "speaking" | "error";

export type Message = {
  role: "user" | "assistant" | "system";
  content: string;
};

const SYSTEM_PROMPT =
  "You are Jarvis, a sophisticated AI assistant. Be helpful, concise, and slightly formal — like a butler with excellent knowledge. Keep responses under 3 sentences unless more detail is specifically requested.";

// q4f16_1 models require 32KB workgroup storage — incompatible with mobile GPUs (limit=16384).
// q0f16 models use f16 weights with no quantization dequant kernels, so workgroup storage stays within 16KB.
const MODEL_CASCADE = [
  "Phi-3.5-mini-instruct-q4f16_1-MLC",   // Best quality, desktop (needs 32KB)
  "SmolLM2-360M-Instruct-q0f16-MLC",     // Mobile-safe: q0f16 = no dequant kernels (16KB ok)
  "SmolLM2-135M-Instruct-q0f16-MLC",     // Smallest fallback
];

const MOBILE_WORKGROUP_LIMIT = 16384;

async function isMobileGPU(): Promise<boolean> {
  try {
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) return false;
    return adapter.limits.maxComputeWorkgroupStorageSize <= MOBILE_WORKGROUP_LIMIT;
  } catch {
    return false;
  }
}

export function useJarvis() {
  const [state, setState] = useState<AppState>("loading");
  const [progress, setProgress] = useState({ text: "Initializing...", progress: 0 });
  const [messages, setMessages] = useState<Message[]>([
    { role: "system", content: SYSTEM_PROMPT },
  ]);
  const [streamingResponse, setStreamingResponse] = useState("");
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [modelId, setModelId] = useState<string>("");
  const [isMobileModel, setIsMobileModel] = useState(false);

  const engineRef = useRef<webllm.MLCEngineInterface | null>(null);

  useEffect(() => {
    let mounted = true;

    async function initEngine() {
      try {
        if (!navigator.gpu) {
          throw new Error(
            "WebGPU is not supported. Please use Chrome 113+ on desktop or Android."
          );
        }

        const mobile = await isMobileGPU();
        // Start from the first mobile-safe model when on mobile, otherwise try all
        const startIndex = mobile ? 1 : 0;
        const candidates = MODEL_CASCADE.slice(startIndex);

        let lastError: Error | null = null;

        for (const candidate of candidates) {
          try {
            if (mounted) {
              setModelId(candidate);
              setIsMobileModel(mobile || startIndex > 0);
              setProgress({ text: `Loading ${candidate.split("-MLC")[0]}...`, progress: 0 });
            }

            const engine = await webllm.CreateMLCEngine(candidate, {
              initProgressCallback: (p) => {
                if (mounted) setProgress({ text: p.text, progress: p.progress });
              },
            });

            if (mounted) {
              engineRef.current = engine;
              setState("idle");
            }
            return; // success — stop cascade
          } catch (err: unknown) {
            lastError = err instanceof Error ? err : new Error(String(err));
            console.warn(`Model ${candidate} failed, trying next...`, lastError.message);
          }
        }

        // All candidates exhausted
        throw lastError ?? new Error("All models failed to load.");
      } catch (err: unknown) {
        console.error("Failed to initialize engine:", err);
        if (mounted) {
          setState("error");
          setErrorDetails(
            err instanceof Error ? err.message : "Failed to initialize WebGPU LLM."
          );
        }
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
      if (!engineRef.current || state !== "idle") return;

      setState("thinking");
      setStreamingResponse("");

      const userMessage: Message = { role: "user", content };
      const newMessages = [...messages, userMessage];
      setMessages(newMessages);

      try {
        const stream = await engineRef.current.chat.completions.create({
          messages: newMessages.slice(-10),
          stream: true,
          max_tokens: 512,
        });

        let fullResponse = "";
        setState("speaking");

        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta?.content || "";
          fullResponse += delta;
          setStreamingResponse(fullResponse);
        }

        setMessages([...newMessages, { role: "assistant", content: fullResponse }]);
        setStreamingResponse("");
        setState("idle");
        return fullResponse;
      } catch (err: unknown) {
        console.error("Chat completion error:", err);
        setState("error");
        setErrorDetails(
          err instanceof Error ? err.message : "Failed to generate response."
        );
        return null;
      }
    },
    [messages, state]
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
    isMobileModel,
  };
}
