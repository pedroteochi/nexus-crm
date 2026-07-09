import { memo, type ReactNode } from 'react';
import { View } from 'react-native';

interface CardProps {
  children: ReactNode;
  className?: string;
}

/** Neutral surface with a soft border and rounded corners. */
const CardComponent = ({ children, className }: CardProps) => (
  <View
    className={`rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 ${className ?? ''}`}
  >
    {children}
  </View>
);

export const Card = memo(CardComponent);
