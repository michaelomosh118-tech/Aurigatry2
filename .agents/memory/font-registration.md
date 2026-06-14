---
name: Font registration pattern
description: How to correctly register Expo Google Fonts so StyleSheet fontFamily strings match
---

## Rule
The KEY in the `useFonts({})` object IS the font family name used in StyleSheet `fontFamily`.

## Correct pattern
```js
const [loaded] = useFonts({
  "DM_Sans_400Regular": DMSans_400Regular,
  "DM_Sans_500Medium": DMSans_500Medium,
  "DM_Sans_700Bold": DMSans_700Bold,
});
// StyleSheet: fontFamily: "DM_Sans_400Regular"
```

## Wrong pattern (breaks silently — fonts load but are never applied)
```js
const [loaded] = useFonts({ DMSans_400Regular }); // key = "DMSans_400Regular"
// StyleSheet: fontFamily: "DM_Sans_400Regular" // ← different string, no match
```

**Why:** React Native matches font files by the key string. If key doesn't match the StyleSheet value, the fallback system font is used with no error.
