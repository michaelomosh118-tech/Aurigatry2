import { useState, useEffect, useRef, useCallback } from "react";
import * as webllm from "@mlc-ai/web-llm";

export type AppState = "idle" | "loading" | "listening" | "thinking" | "speaking" | "error";

export type Message = {
  role: "user" | "assistant" | "system";
  content: string;
};

const SYSTEM_PROMPT =
  "You are Jarvis, a sophisticated AI assistant. Be helpful, concise, and slightly formal — like a butler with excellent knowledge. Keep responses under 3 sentences unless more detail is specifically requested.";

const DESKTOP_MODEL = "Phi-3.5-mini-instruct-q4f16_1-MLC";
const MOBILE_MODEL = "Qwen2.5-0.5B-Instruct-q4f16_1-MLC";
const MOBILE_WORKGROUP_LIMIT = 16384;

async function selectModel(): Promise<{ modelId: string; isMobile: boolean }> {
  try {
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) return { modelId: DESKTOP_MODEL, isMobile: false };
    const limit = adapter.limits.maxComputeWorkgroupStorageSize;
    if (limit <= MOBILE_WORKGROUP_LIMIT) {
      return { modelId: MOBILE_MODEL, isMobile: true };
    }
  } catch {
    // If we can't query limits, assume desktop
  }
  return { modelId: DESKTOP_MODEL, isMobile: false };
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
            "WebGPU is not supported in this browser. Please use Chrome 113+ on desktop or Android."
          );
        }

        const { modelId: selectedModel, isMobile } = await selectModel();
        if (mounted) {
          setModelId(selectedModel);
          setIsMobileModel(isMobile);
        }

        const engine = await webllm.CreateMLCEngine(selectedModel, {
          initProgressCallback: (p) => {
            if (mounted) {
              setProgress({ text: p.text, progress: p.progress });
            }
          },
        });

        if (mounted) {
          engineRef.current = engine;
          setState("idle");
        }
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
