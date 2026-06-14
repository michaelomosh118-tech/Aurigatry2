// Native (Android/iOS) implementation — uses llama.rn + expo-file-system.
// Metro loads this file on native builds; useLlama.ts is the web stub.

import { initLlama, LlamaContext } from "llama.rn";
import * as FileSystem from "expo-file-system";
import { useCallback, useRef, useState } from "react";

export type LlamaStatus =
  | "unavailable"
  | "no-model"
  | "downloading"
  | "loading"
  | "ready"
  | "error";

const MODEL_URL =
  "https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/resolve/main/qwen2.5-0.5b-instruct-q4_k_m.gguf";
const MODEL_FILENAME = "qwen2.5-0.5b-q4_k_m.gguf";

const SYSTEM_PROMPT =
  "You are Jarvis, a helpful AI assistant. Be concise and clear. Respond in plain spoken language only — no markdown, no bullet points, no symbols. Keep answers under 3 sentences unless more detail is requested.";

export function useLlama() {
  const [status, setStatus] = useState<LlamaStatus>("no-model");
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const contextRef = useRef<LlamaContext | null>(null);

  const modelPath = `${FileSystem.documentDirectory}${MODEL_FILENAME}`;

  const checkModelExists = useCallback(async (): Promise<boolean> => {
    try {
      const info = await FileSystem.getInfoAsync(modelPath);
      return info.exists && (info as { size?: number }).size
        ? (info as { size: number }).size > 1_000_000
        : false;
    } catch {
      return false;
    }
  }, [modelPath]);

  const initModel = useCallback(
    async (path: string) => {
      setStatus("loading");
      try {
        contextRef.current = await initLlama({
          model: path,
          use_mlock: true,
          n_ctx: 2048,
          n_batch: 512,
          n_threads: 4,
        });
        setStatus("ready");
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Model init failed";
        setErrorMessage(msg);
        setStatus("error");
      }
    },
    []
  );

  const initialize = useCallback(async () => {
    const exists = await checkModelExists();
    if (exists) {
      await initModel(modelPath);
    } else {
      setStatus("no-model");
    }
  }, [checkModelExists, initModel, modelPath]);

  const downloadModel = useCallback(async () => {
    setStatus("downloading");
    setDownloadProgress(0);
    try {
      const dl = FileSystem.createDownloadResumable(
        MODEL_URL,
        modelPath,
        {},
        (progress) => {
          const pct =
            progress.totalBytesExpectedToWrite > 0
              ? (progress.totalBytesWritten /
                  progress.totalBytesExpectedToWrite) *
                100
              : 0;
          setDownloadProgress(Math.round(pct));
        }
      );
      await dl.downloadAsync();
      await initModel(modelPath);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Download failed";
      setErrorMessage(msg);
      setStatus("error");
    }
  }, [modelPath, initModel]);

  const generate = useCallback(
    async (
      messages: Array<{ role: string; content: string }>,
      onToken: (token: string) => void
    ): Promise<string> => {
      if (!contextRef.current) throw new Error("Model not ready");

      let fullText = "";
      await contextRef.current.completion(
        {
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            ...messages.slice(-8),
          ],
          temperature: 0.7,
          top_p: 0.9,
          max_new_tokens: 256,
          stop: ["</s>", "<|im_end|>"],
        },
        (data: { token: string }) => {
          fullText += data.token;
          onToken(data.token);
        }
      );
      return fullText;
    },
    []
  );

  const deleteModel = useCallback(async () => {
    if (contextRef.current) {
      try {
        await contextRef.current.release();
      } catch {
        // ignore
      }
      contextRef.current = null;
    }
    try {
      await FileSystem.deleteAsync(modelPath, { idempotent: true });
    } catch {
      // ignore
    }
    setStatus("no-model");
    setDownloadProgress(0);
  }, [modelPath]);

  return {
    status,
    downloadProgress,
    errorMessage,
    initialize,
    downloadModel,
    generate,
    deleteModel,
  };
}
