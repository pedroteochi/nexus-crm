import { memo, useEffect, useState } from 'react';
import { Animated, View } from 'react-native';
import { useColorScheme } from 'nativewind';

// Placeholder block colors per theme (base = stronger, tint = subtler second line).
const BLOCKS = {
  light: { base: '#e4e4e7', tint: '#ececee' },
  dark: { base: '#27272a', tint: '#3f3f46' },
};

const usePulse = (): Animated.Value => {
  // Lazy initializer: the Animated.Value is constructed once, not on every render.
  const [opacity] = useState(() => new Animated.Value(0.5));
  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.5, duration: 700, useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);
  return opacity;
};

interface SkeletonRowProps {
  opacity: Animated.Value;
  base: string;
  tint: string;
}

const SkeletonRow = ({ opacity, base, tint }: SkeletonRowProps) => (
  <View className="flex-row items-center gap-3 px-4 py-3">
    <Animated.View
      style={{ opacity, width: 44, height: 44, borderRadius: 22, backgroundColor: base }}
    />
    <View className="flex-1 gap-2">
      <Animated.View
        style={{ opacity, width: '55%', height: 12, borderRadius: 6, backgroundColor: base }}
      />
      <Animated.View
        style={{ opacity, width: '80%', height: 10, borderRadius: 6, backgroundColor: tint }}
      />
    </View>
  </View>
);

interface SkeletonLoadingProps {
  rows?: number;
}

/** Pulsing list placeholder shown while the store rehydrates from storage. */
const SkeletonLoadingComponent = ({ rows = 7 }: SkeletonLoadingProps) => {
  const opacity = usePulse();
  const { base, tint } = BLOCKS[useColorScheme().colorScheme === 'dark' ? 'dark' : 'light'];
  return (
    <View accessibilityLabel="Carregando" className="pt-2">
      {Array.from({ length: rows }, (_, index) => (
        <SkeletonRow key={`skeleton-${index}`} opacity={opacity} base={base} tint={tint} />
      ))}
    </View>
  );
};

export const SkeletonLoading = memo(SkeletonLoadingComponent);
