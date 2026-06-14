// Web stub — llama.rn is a native-only module.
// Metro loads this file on web; useLlama.native.ts is loaded on Android/iOS.

export type LlamaStatus =
  | "unavailable"
  | "no-model"
  | "downloading"
  | "loading"
  | "ready"
  | "error";

export function useLlama() {
  return {
    status: "unavailable" as LlamaStatus,
    downloadProgress: 0,
    errorMessage: "",
    initialize: async () => {},
    downloadModel: async () => {},
    generate: async (
      _messages: Array<{ role: string; content: string }>,
      _onToken: (token: string) => void
    ): Promise<string> => {
      throw new Error("Offline model unavailable in web preview");
    },
    deleteModel: async () => {},
  };
}
