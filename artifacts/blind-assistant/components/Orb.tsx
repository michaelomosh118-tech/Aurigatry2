import React, { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import colors from "@/constants/colors";

const c = colors.light;

type OrbState = "idle" | "listening" | "thinking" | "speaking" | "error" | "no-key";

interface OrbProps {
  state: OrbState;
  size?: number;
}

export function Orb({ state, size = 160 }: OrbProps) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.9);
  const ring1Opacity = useSharedValue(0);
  const ring1Scale = useSharedValue(1);
  const ring2Opacity = useSharedValue(0);
  const ring2Scale = useSharedValue(1);
  const glowOpacity = useSharedValue(0.3);

  useEffect(() => {
    cancelAnimation(scale);
    cancelAnimation(opacity);
    cancelAnimation(ring1Opacity);
    cancelAnimation(ring1Scale);
    cancelAnimation(ring2Opacity);
    cancelAnimation(ring2Scale);
    cancelAnimation(glowOpacity);

    if (state === "idle" || state === "no-key") {
      scale.value = withRepeat(
        withSequence(
          withTiming(1.04, { duration: 2000 }),
          withTiming(1, { duration: 2000 })
        ),
        -1,
        true
      );
      glowOpacity.value = withRepeat(
        withSequence(withTiming(0.5, { duration: 2000 }), withTiming(0.2, { duration: 2000 })),
        -1,
        true
      );
      ring1Opacity.value = withTiming(0, { duration: 300 });
      ring2Opacity.value = withTiming(0, { duration: 300 });

    } else if (state === "listening") {
      scale.value = withRepeat(
        withSequence(
          withTiming(1.1, { duration: 400 }),
          withTiming(1, { duration: 400 })
        ),
        -1,
        true
      );
      ring1Scale.value = 1;
      ring1Opacity.value = withRepeat(
        withSequence(withTiming(0.5, { duration: 100 }), withTiming(0, { duration: 900 })),
        -1,
        false
      );
      ring1Scale.value = withRepeat(withTiming(2.4, { duration: 1000 }), -1, false);
      ring2Scale.value = 1;
      ring2Opacity.value = withRepeat(
        withSequence(
          withTiming(0, { duration: 500 }),
          withTiming(0.35, { duration: 100 }),
          withTiming(0, { duration: 900 })
        ),
        -1,
        false
      );
      ring2Scale.value = withRepeat(
        withSequence(withTiming(1, { duration: 500 }), withTiming(2.8, { duration: 1500 })),
        -1,
        false
      );
      glowOpacity.value = withRepeat(
        withSequence(withTiming(0.8, { duration: 400 }), withTiming(0.4, { duration: 400 })),
        -1,
        true
      );

    } else if (state === "thinking") {
      scale.value = withRepeat(
        withSequence(
          withTiming(0.93, { duration: 500 }),
          withTiming(1.03, { duration: 500 })
        ),
        -1,
        true
      );
      opacity.value = withRepeat(
        withSequence(withTiming(0.5, { duration: 600 }), withTiming(1, { duration: 600 })),
        -1,
        true
      );
      ring1Opacity.value = withTiming(0, { duration: 200 });
      ring2Opacity.value = withTiming(0, { duration: 200 });
      glowOpacity.value = withRepeat(
        withSequence(withTiming(0.2, { duration: 600 }), withTiming(0.6, { duration: 600 })),
        -1,
        true
      );

    } else if (state === "speaking") {
      scale.value = withRepeat(
        withSequence(
          withTiming(1.08, { duration: 250 }),
          withTiming(0.97, { duration: 250 }),
          withTiming(1.05, { duration: 200 }),
          withTiming(1, { duration: 300 })
        ),
        -1,
        false
      );
      ring1Scale.value = 1;
      ring1Opacity.value = withRepeat(
        withSequence(withTiming(0.4, { duration: 200 }), withTiming(0, { duration: 600 })),
        -1,
        false
      );
      ring1Scale.value = withRepeat(withTiming(1.8, { duration: 800 }), -1, false);
      ring2Opacity.value = withTiming(0, { duration: 200 });
      glowOpacity.value = withRepeat(
        withSequence(withTiming(0.7, { duration: 250 }), withTiming(0.3, { duration: 250 })),
        -1,
        true
      );

    } else if (state === "error") {
      scale.value = withSpring(1);
      ring1Opacity.value = withTiming(0);
      ring2Opacity.value = withTiming(0);
      glowOpacity.value = withTiming(0.4);
    }
  }, [state]);

  const orbColor =
    state === "listening" ? "#ff6b6b"
    : state === "error" ? c.destructive
    : c.primary;

  const orbStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const ring1Style = useAnimatedStyle(() => ({
    opacity: ring1Opacity.value,
    transform: [{ scale: ring1Scale.value }],
  }));

  const ring2Style = useAnimatedStyle(() => ({
    opacity: ring2Opacity.value,
    transform: [{ scale: ring2Scale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const half = size / 2;
  const ringSize = size * 1.1;

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      {/* Glow */}
      <Animated.View
        style={[
          {
            position: "absolute",
            width: size * 1.4,
            height: size * 1.4,
            borderRadius: (size * 1.4) / 2,
            backgroundColor: orbColor,
          },
          glowStyle,
        ]}
      />

      {/* Rings */}
      <Animated.View
        style={[
          {
            position: "absolute",
            width: ringSize,
            height: ringSize,
            borderRadius: ringSize / 2,
            borderWidth: 1.5,
            borderColor: orbColor,
          },
          ring1Style,
        ]}
      />
      <Animated.View
        style={[
          {
            position: "absolute",
            width: ringSize,
            height: ringSize,
            borderRadius: ringSize / 2,
            borderWidth: 1,
            borderColor: orbColor,
          },
          ring2Style,
        ]}
      />

      {/* Core */}
      <Animated.View
        style={[
          {
            width: size,
            height: size,
            borderRadius: half,
            backgroundColor: orbColor,
            shadowColor: orbColor,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.9,
            shadowRadius: 24,
            elevation: 20,
          },
          orbStyle,
        ]}
      />
    </View>
  );
}
