import { useState, useEffect, useRef, useCallback } from "react";
import * as webllm from "@mlc-ai/web-llm";

export type AppState = "idle" | "loading" | "listening" | "thinking" | "speaking" | "error";

export type Message = {
  role: "user" | "assistant" | "system";
  content: string;
};

const SYSTEM_PROMPT =
  "You are Jarvis, a sophisticated AI assistant. Be helpful, concise, and slightly formal — like a butler with excellent knowledge. Keep responses under 3 sentences unless more detail is specifically requested.";

// q4f16_1 kernels require 32KB workgroup storage (incompatible with mobile GPUs that limit to 16KB).
// q0f16 models have no dequant kernels and stay within 16KB — safe on all devices.
// We try best→smallest; the first one that loads wins.
const MODEL_CASCADE = [
  "Phi-3.5-mini-instruct-q4f16_1-MLC",
  "SmolLM2-360M-Instruct-q0f16-MLC",
  "SmolLM2-135M-Instruct-q0f16-MLC",
];

const MOBILE_MODELS = new Set([
  "SmolLM2-360M-Instruct-q0f16-MLC",
  "SmolLM2-135M-Instruct-q0f16-MLC",
]);

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
      if (!navigator.gpu) {
        if (mounted) {
          setState("error");
          setErrorDetails("WebGPU is not supported. Please use Chrome 113+ on desktop or Android Chrome.");
        }
        return;
      }

      for (const candidate of MODEL_CASCADE) {
        if (!mounted) return;

        try {
          if (mounted) {
            setModelId(candidate);
            setIsMobileModel(MOBILE_MODELS.has(candidate));
            setProgress({ text: `Loading ${candidate.replace("-MLC", "")}...`, progress: 0 });
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
          return; // loaded successfully — stop cascade
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          console.warn(`[Jarvis] ${candidate} failed: ${msg}. Trying next model...`);
          // continue to next candidate
        }
      }

      // All models failed
      if (mounted) {
        setState("error");
        setErrorDetails("Could not load any compatible model on this device. Try Chrome on a desktop or a newer Android device with WebGPU support.");
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
        setErrorDetails(err instanceof Error ? err.message : "Failed to generate response.");
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
