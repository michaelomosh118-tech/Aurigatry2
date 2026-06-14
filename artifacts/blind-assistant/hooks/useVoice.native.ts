// Native (Android/iOS) implementation — uses @react-native-voice/voice.
// Metro loads this on native builds; useVoice.ts is the web stub.

import Voice, { SpeechResultsEvent } from "@react-native-voice/voice";
import { useCallback, useEffect, useRef, useState } from "react";

export type VoiceStatus = "idle" | "listening" | "unavailable";

export function useVoice() {
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [transcript, setTranscript] = useState("");
  const [isAvailable, setIsAvailable] = useState(false);
  const callbackRef = useRef<((text: string) => void) | null>(null);

  useEffect(() => {
    Voice.isAvailable().then((v) => setIsAvailable(!!v));

    Voice.onSpeechResults = (e: SpeechResultsEvent) => {
      const text = e.value?.[0] ?? "";
      setTranscript(text);
      if (callbackRef.current && text) {
        callbackRef.current(text);
        callbackRef.current = null;
      }
      setStatus("idle");
    };

    Voice.onSpeechError = () => {
      setStatus("idle");
      setTranscript("");
    };

    Voice.onSpeechEnd = () => {
      setStatus("idle");
    };

    return () => {
      Voice.destroy().catch(() => null);
    };
  }, []);

  const startListening = useCallback(
    async (onResult: (text: string) => void): Promise<boolean> => {
      if (!isAvailable) return false;
      callbackRef.current = onResult;
      setTranscript("");
      setStatus("listening");
      try {
        await Voice.start("en-US");
        return true;
      } catch {
        setStatus("idle");
        return false;
      }
    },
    [isAvailable]
  );

  const stopListening = useCallback(async () => {
    try {
      await Voice.stop();
    } catch {
      // ignore
    }
    setStatus("idle");
  }, []);

  const cancelListening = useCallback(async () => {
    try {
      await Voice.cancel();
    } catch {
      // ignore
    }
    callbackRef.current = null;
    setStatus("idle");
    setTranscript("");
  }, []);

  return {
    status,
    transcript,
    isAvailable,
    startListening,
    stopListening,
    cancelListening,
  };
}
