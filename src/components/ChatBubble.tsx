import { memo } from 'react';
import { Pressable, Text, View } from 'react-native';

import type { Message } from '@/types/models';
import { formatClockTime } from '@/utils/time';

interface ChatBubbleProps {
  message: Message;
  /** Called when the user taps a failed message to re-send it. */
  onRetry?: (messageId: string) => void;
}

/** A single chat bubble. User messages are indigo/right-aligned, assistant
 * messages are neutral/left-aligned. A failed user message is tappable to retry.
 * Markdown is intentionally NOT rendered. */
const ChatBubbleComponent = ({ message, onRetry }: ChatBubbleProps) => {
  const isUser = message.role === 'user';
  const isError = message.status === 'error';
  const isSending = message.status === 'sending';
  const canRetry = isError && isUser && onRetry !== undefined;

  const bubbleClass = isUser
    ? isError
      ? 'rounded-br-md bg-red-500'
      : 'rounded-br-md bg-primary'
    : 'rounded-bl-md border border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800';

  return (
    <View className={`mb-2 max-w-[82%] ${isUser ? 'self-end' : 'self-start'}`}>
      <View className={`rounded-2xl px-4 py-2.5 ${bubbleClass}`}>
        <Text
          className={`text-[15px] leading-5 ${isUser ? 'text-white' : 'text-zinc-900 dark:text-zinc-50'}`}
        >
          {message.text}
        </Text>
      </View>
      <View
        className={`mt-1 flex-row items-center gap-1 px-1 ${
          isUser ? 'justify-end' : 'justify-start'
        }`}
      >
        <Text className="text-[11px] text-zinc-400">{formatClockTime(message.createdAt)}</Text>
        {isUser && isSending ? (
          <Text className="text-[11px] text-zinc-400">· Enviando…</Text>
        ) : null}
        {isError ? (
          <Text className="text-[11px] font-medium text-red-500">· Falha ao enviar</Text>
        ) : null}
      </View>
      {isError ? (
        <Pressable
          onPress={canRetry ? () => onRetry?.(message.id) : undefined}
          disabled={!canRetry}
          accessibilityRole={canRetry ? 'button' : undefined}
          accessibilityLabel={canRetry ? 'Tentar enviar de novo' : undefined}
          className={`mt-0.5 px-1 ${isUser ? 'items-end' : 'items-start'}`}
        >
          {message.errorReason ? (
            <Text
              className={`text-[11px] leading-4 text-red-500 ${isUser ? 'text-right' : 'text-left'}`}
            >
              {message.errorReason}
            </Text>
          ) : null}
          {canRetry ? (
            <Text className="text-[11px] font-medium text-red-600">Toque para tentar de novo</Text>
          ) : null}
        </Pressable>
      ) : null}
    </View>
  );
};

export const ChatBubble = memo(ChatBubbleComponent);
