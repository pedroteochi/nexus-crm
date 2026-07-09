import { memo, useEffect, useState } from 'react';
import { Animated, View } from 'react-native';

const PULSE_DURATION = 400;
const DIM = 0.3;
const BRIGHT = 1;

/** One pulsing dot. Uses the native `Animated` driver — no reanimated dependency. */
const Dot = ({ delay }: { delay: number }) => {
  // Lazy initializer: the Animated.Value is constructed once, not on every render.
  const [opacity] = useState(() => new Animated.Value(DIM));

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(opacity, {
          toValue: BRIGHT,
          duration: PULSE_DURATION,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, { toValue: DIM, duration: PULSE_DURATION, useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [delay, opacity]);

  return (
    <Animated.View
      style={{ opacity, width: 8, height: 8, borderRadius: 4, backgroundColor: '#a1a1aa' }}
    />
  );
};

/** Three-dot "assistant is typing" indicator shown while a reply is pending. */
const TypingIndicatorComponent = () => (
  <View
    accessibilityLabel="O assistente está digitando"
    accessibilityRole="progressbar"
    className="mb-2 max-w-[82%] self-start"
  >
    <View className="flex-row items-center gap-1.5 rounded-2xl rounded-bl-md border border-zinc-200 bg-zinc-100 px-4 py-3.5 dark:border-zinc-700 dark:bg-zinc-800">
      <Dot delay={0} />
      <Dot delay={150} />
      <Dot delay={300} />
    </View>
  </View>
);

export const TypingIndicator = memo(TypingIndicatorComponent);
