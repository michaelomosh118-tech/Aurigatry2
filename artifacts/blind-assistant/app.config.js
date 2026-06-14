const projectId = process.env.EAS_PROJECT_ID;

export default {
  expo: {
    name: "Jarvis",
    slug: "jarvis-offline",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "jarvis-offline",
    userInterfaceStyle: "dark",
    newArchEnabled: true,
    splash: {
      image: "./assets/images/icon.png",
      resizeMode: "contain",
      backgroundColor: "#0a0f1e",
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/images/icon.png",
        backgroundColor: "#0a0f1e",
      },
      permissions: [
        "android.permission.RECORD_AUDIO",
        "android.permission.INTERNET",
        "android.permission.READ_EXTERNAL_STORAGE",
        "android.permission.WRITE_EXTERNAL_STORAGE",
      ],
      package: "com.jarvis.offline",
    },
    ios: {
      supportsTablet: false,
      infoPlist: {
        NSSpeechRecognitionUsageDescription:
          "Jarvis needs speech recognition to hear your voice commands.",
        NSMicrophoneUsageDescription:
          "Jarvis needs microphone access to listen to your voice.",
      },
    },
    web: {
      favicon: "./assets/images/icon.png",
    },
    plugins: [
      [
        "expo-router",
        {
          origin: "https://replit.com/",
        },
      ],
      "expo-font",
    ],
    experiments: {
      typedRoutes: true,
    },
    ...(projectId
      ? {
          extra: {
            eas: { projectId },
          },
          owner: process.env.EXPO_OWNER,
        }
      : {}),
  },
};
