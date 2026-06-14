---
name: Blind-assistant bug fixes
description: Critical bugs found and fixed in the blind-assistant Expo app and related packages
---

## Key fixed bugs

**EAS Build:**
- `eas.json` `gradleCommand` conflicts with `buildType: "apk"` — remove `gradleCommand`, let EAS derive it from `buildType`

**Font names:**
- `useFonts({ DMSans_400Regular })` registers family as `"DMSans_400Regular"` but all StyleSheets used `"DM_Sans_400Regular"` — must use explicit key: `useFonts({ "DM_Sans_400Regular": DMSans_400Regular })`

**useLlama.native.ts:**
- `FileSystem.documentDirectory` may not have trailing slash — always normalize: `rawDir.endsWith("/") ? rawDir : rawDir + "/"`
- LlamaContext never released on unmount — add `useEffect(() => () => contextRef.current?.release().catch(() => null), [])`
- `useEffect` import was missing when cleanup was added

**useVoice.native.ts:**
- Clear `callbackRef.current` before calling to avoid double-fire: `const cb = callbackRef.current; callbackRef.current = null; cb?.(text)`

**settings.tsx:**
- `Alert.alert` is a no-op on web — use `window.confirm/alert` behind `Platform.OS === "web"` guard

**metro.config.js:**
- Add `config.resolver.unstable_enablePackageExports = true` for modern package resolution (zod v4, workspace links)

**api-server/app.ts:**
- No global Express error handler — stack traces leaked in production; add 4-arg `(err, req, res, next)` middleware

**jarvis/useJarvis.ts:**
- SSE `[DONE]` check used `break` which exits the inner `for` loop but not the outer `while` reader loop — use a `streamDone` flag

**Why:** All these were caught by 3 parallel explore subagents doing deep analysis.
