import { memo, type ReactNode } from 'react';
import { Pressable } from 'react-native';

interface IconButtonProps {
  onPress: () => void;
  accessibilityLabel: string;
  children: ReactNode;
  disabled?: boolean;
  className?: string;
}

/** Round, accessible icon button with a ≥44px touch target. */
const IconButtonComponent = ({
  onPress,
  accessibilityLabel,
  children,
  disabled = false,
  className,
}: IconButtonProps) => (
  <Pressable
    onPress={onPress}
    disabled={disabled}
    accessibilityRole="button"
    accessibilityLabel={accessibilityLabel}
    accessibilityState={{ disabled }}
    hitSlop={8}
    className={`h-11 w-11 items-center justify-center rounded-full active:bg-zinc-100 dark:active:bg-zinc-800 ${
      disabled ? 'opacity-40' : ''
    } ${className ?? ''}`}
  >
    {children}
  </Pressable>
);

export const IconButton = memo(IconButtonComponent);
