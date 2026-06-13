import { useState, useEffect, useRef, useCallback } from "react";
import * as webllm from "@mlc-ai/web-llm";

export type AppState = "idle" | "loading" | "listening" | "thinking" | "speaking" | "error";

export type Message = {
  role: "user" | "assistant" | "system";
  content: string;
};

export type BackendType = "webgpu" | "wasm" | null;

const SYSTEM_PROMPT =
  "You are Jarvis, a sophisticated AI assistant. Be helpful, concise, and slightly formal — like a butler with excellent knowledge. Keep responses under 3 sentences unless more detail is specifically requested.";

// WebGPU models: q4f16_1 needs 32KB workgroup — fails on mobile GPUs limited to 16KB
const WEBGPU_MODELS = [
  "Phi-3.5-mini-instruct-q4f16_1-MLC",
  "SmolLM2-360M-Instruct-q0f16-MLC",
  "SmolLM2-135M-Instruct-q0f16-MLC",
];

// WASM/CPU model: runs via WebAssembly, no GPU required — works on any device
const WASM_MODEL = "onnx-community/Qwen2.5-0.5B-Instruct-ONNX";

type UnifiedEngine =
  | { type: "webgpu"; engine: webllm.MLCEngineInterface }
  | { type: "wasm"; pipe: (messages: object[], options: object) => Promise<unknown>; tokenizer: unknown };

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

  const engineRef = useRef<UnifiedEngine | null>(null);

  useEffect(() => {
    let mounted = true;

    async function tryWebGPU(): Promise<boolean> {
      if (!(navigator as Navigator & { gpu?: unknown }).gpu) return false;

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
            engineRef.current = { type: "webgpu", engine };
            setBackend("webgpu");
            setState("idle");
          }
          return true;
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.warn(`[Jarvis] WebGPU model ${candidate} failed: ${msg}`);
        }
      }
      return false;
    }

    async function tryWASM(): Promise<boolean> {
      if (!mounted) return false;
      try {
        if (mounted) {
          setModelId(WASM_MODEL);
          setBackend("wasm");
          setProgress({ text: "Loading CPU model (no GPU needed)...", progress: 0 });
        }

        const { pipeline, TextStreamer } = await import("@huggingface/transformers");

        const pipe = await pipeline(
          "text-generation",
          WASM_MODEL,
          {
            dtype: "q4",
            device: "wasm",
            progress_callback: (p: { status: string; file?: string; progress?: number }) => {
              if (!mounted) return;
              if (p.status === "progress" && p.file) {
                setProgress({
                  text: `Downloading ${p.file}...`,
                  progress: (p.progress ?? 0) / 100,
                });
              } else if (p.status === "done") {
                setProgress({ text: "Model ready", progress: 1 });
              }
            },
          }
        );

        if (mounted) {
          engineRef.current = {
            type: "wasm",
            pipe: pipe as (messages: object[], options: object) => Promise<unknown>,
            tokenizer: (pipe as { tokenizer: unknown }).tokenizer,
          };
          setState("idle");
        }

        // Store TextStreamer constructor for later use
        (engineRef.current as { TextStreamer?: unknown }).TextStreamer = TextStreamer;
        return true;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[Jarvis] WASM fallback failed: ${msg}`);
        return false;
      }
    }

    async function initEngine() {
      const gpuOk = await tryWebGPU();
      if (!gpuOk && mounted) {
        setProgress({ text: "GPU unavailable — switching to CPU mode...", progress: 0 });
        const wasmOk = await tryWASM();
        if (!wasmOk && mounted) {
          setState("error");
          setErrorDetails(
            "Could not initialize the AI engine on this device. Make sure you are using a recent version of Chrome or Safari."
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
        const ctx = newMessages.slice(-10);
        let fullResponse = "";

        if (engineRef.current.type === "webgpu") {
          setState("speaking");
          const stream = await engineRef.current.engine.chat.completions.create({
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
          // WASM path — use TextStreamer for token-by-token output
          setState("speaking");
          const { TextStreamer } = await import("@huggingface/transformers");
          const wasmEngine = engineRef.current;

          const streamer = new TextStreamer(
            (wasmEngine as { tokenizer: ConstructorParameters<typeof TextStreamer>[0] }).tokenizer,
            {
              skip_prompt: true,
              skip_special_tokens: true,
              callback_function: (text: string) => {
                fullResponse += text;
                setStreamingResponse(fullResponse);
              },
            }
          );

          await wasmEngine.pipe(
            ctx.map((m) => ({ role: m.role, content: m.content })),
            {
              max_new_tokens: 256,
              streamer,
              do_sample: false,
            }
          );
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
    isMobileModel: backend === "wasm",
    backend,
  };
}
