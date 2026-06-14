// Web stub — @react-native-voice/voice is native-only.
// Metro loads this on web; useVoice.native.ts is loaded on Android/iOS.

export type VoiceStatus = "idle" | "listening" | "unavailable";

export function useVoice() {
  return {
    status: "idle" as VoiceStatus,
    transcript: "",
    isAvailable: false,
    startListening: async (_onResult: (text: string) => void) => false,
    stopListening: async () => {},
    cancelListening: async () => {},
  };
}
