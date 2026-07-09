import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  InteractionManager,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
  type ListRenderItem,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  FileText,
  MessageCircle,
  MoreHorizontal,
  Send,
  Sparkles,
  Target,
  Trash2,
  User,
} from 'lucide-react-native';

import { Avatar } from '@/components/Avatar';
import { ChatBubble } from '@/components/ChatBubble';
import { ChatMenu, type ChatMenuItem } from '@/components/ChatMenu';
import { CopilotAnalysis } from '@/components/CopilotAnalysis';
import { CopilotSummary } from '@/components/CopilotSummary';
import { EmptyState } from '@/components/EmptyState';
import { OpportunityFormModal } from '@/components/OpportunityFormModal';
import { TypingIndicator } from '@/components/TypingIndicator';
import { useChat } from '@/hooks/useChat';
import { useCopilot } from '@/hooks/useCopilot';
import { useKeyboard } from '@/hooks/useKeyboard';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { DealDraft } from '@/services/openai';
import { useCrmStore } from '@/store/crmStore';
import type { Message } from '@/types/models';

const HEADER_APPROX_HEIGHT = 44;

export default function ChatScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const chatId = params.id ?? '';
  const router = useRouter();
  const { chat, contact, company, messages, isSending, send, retry } = useChat(chatId);
  const deleteChat = useCrmStore((state) => state.deleteChat);
  const {
    isSuggesting,
    isSummarizing,
    isAnalyzing,
    isDrafting,
    summary,
    analysis,
    error: copilotError,
    suggest,
    summarize,
    analyze,
    draftDeal,
    clearSummary,
    clearAnalysis,
    clearError,
  } = useCopilot();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const keyboard = useKeyboard();
  const listRef = useRef<FlatList<Message>>(null);
  const [draft, setDraft] = useState('');
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [analysisOpen, setAnalysisOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [oppFormOpen, setOppFormOpen] = useState(false);
  const [dealDraft, setDealDraft] = useState<DealDraft | null>(null);

  // Latest "is some surface already open" flag, read after the async draft resolves
  // to avoid stacking the form over another sheet or hijacking an open form.
  const busyRef = useRef(false);
  busyRef.current = menuOpen || oppFormOpen || summaryOpen || analysisOpen;

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
  }, []);

  useEffect(() => {
    if (messages.length > 0) scrollToEnd();
  }, [messages.length, isSending, keyboard.visible, scrollToEnd]);

  // Self-heal: if the chat/contact/company disappears after being shown (e.g. a
  // contact deleted from its detail cascades this chat away), leave instead of
  // dead-ending on "not found". A fresh deep-link to a bad id keeps the empty state.
  const wasPresent = useRef(false);
  useEffect(() => {
    if (chat && contact && company) {
      wasPresent.current = true;
      return;
    }
    if (wasPresent.current && router.canGoBack()) router.back();
  }, [chat, contact, company, router]);

  const handleSend = useCallback(() => {
    const text = draft.trim();
    if (!text || isSending) return;
    setDraft('');
    void send(text);
  }, [draft, isSending, send]);

  const handleRetry = useCallback((messageId: string) => void retry(messageId), [retry]);

  // Copilot: draft the rep's next message into the composer.
  const handleSuggest = useCallback(async () => {
    if (!contact || !company) return;
    const suggestion = await suggest(contact, company, messages);
    if (suggestion) setDraft(suggestion);
  }, [contact, company, messages, suggest]);

  // Copilot: open the sheet and summarize the thread.
  const handleSummarize = useCallback(() => {
    if (!contact || !company || messages.length === 0) return;
    setSummaryOpen(true);
    void summarize(contact, company, messages);
  }, [contact, company, messages, summarize]);

  const handleCloseSummary = useCallback(() => {
    setSummaryOpen(false);
    clearSummary();
  }, [clearSummary]);

  // Copilot: score the rep's performance and open the analysis sheet.
  const handleAnalyze = useCallback(() => {
    if (!contact || !company || messages.length === 0) return;
    setAnalysisOpen(true);
    void analyze(contact, company, messages);
  }, [contact, company, messages, analyze]);

  const handleCloseAnalysis = useCallback(() => {
    setAnalysisOpen(false);
    clearAnalysis();
  }, [clearAnalysis]);

  const handleViewContact = useCallback(() => {
    if (!contact) return;
    router.push(`/contact/${contact.id}`);
  }, [contact, router]);

  // Bridge Conversas -> Funil: create a deal for this contact without leaving the
  // chat. ChatMenu defers this until it dismisses, so the form presents cleanly.
  const handleNewOpportunity = useCallback(() => {
    setDealDraft(null);
    setOppFormOpen(true);
  }, []);

  // AI bridge: the model reads the thread and drafts the deal, then the form opens
  // pre-filled for the rep to confirm. Runs after the menu dismisses (isDrafting
  // shows a composer chip during the call); never auto-creates.
  const handleDraftOpportunity = useCallback(async () => {
    if (!contact || !company) return;
    const result = await draftDeal(contact, company, messages);
    // Up to 15s may pass; if the rep opened another surface meanwhile, drop the
    // draft rather than stacking over it or overwriting a form they're editing.
    if (result && !busyRef.current) {
      setDealDraft(result);
      setOppFormOpen(true);
    }
  }, [contact, company, messages, draftDeal]);

  // Only toggle visibility on close — the draft is reset at open time (manual clears
  // it, AI sets it), so it survives the dismiss animation and the "IA sugeriu" banner
  // doesn't collapse mid-slide-out.
  const handleCloseOppForm = useCallback(() => setOppFormOpen(false), []);

  const handleDeleteChat = useCallback(() => {
    Alert.alert('Excluir conversa?', 'As mensagens serão removidas. O contato é mantido.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: () => {
          // Navigate away, then delete AFTER the transition so the outgoing
          // screen never re-renders into the "not found" empty state mid-animation.
          router.back();
          InteractionManager.runAfterInteractions(() => deleteChat(chatId));
        },
      },
    ]);
  }, [chatId, deleteChat, router]);

  // Surface Copilot failures once, then reset so they don't re-alert on render.
  // Close ONLY the sheet tied to the failed action (each opens optimistically);
  // an abandoned action must not dismiss a sheet the user is actively reading.
  useEffect(() => {
    if (!copilotError) return;
    if (copilotError.source === 'summarize') setSummaryOpen(false);
    if (copilotError.source === 'analyze') setAnalysisOpen(false);
    Alert.alert('Copilot', copilotError.message);
    clearError();
  }, [copilotError, clearError]);

  const renderItem: ListRenderItem<Message> = useCallback(
    ({ item }) => <ChatBubble message={item} onRetry={handleRetry} />,
    [handleRetry],
  );

  // Chat/contact/company should always resolve for a valid id; guard defensively.
  if (!chat || !contact || !company) {
    return (
      <View className="flex-1 bg-white dark:bg-zinc-950">
        <Stack.Screen options={{ title: 'Conversa' }} />
        <EmptyState
          icon={<MessageCircle color="#a1a1aa" size={28} />}
          title="Conversa não encontrada"
          description="Esta conversa pode ter sido removida."
        />
      </View>
    );
  }

  const firstName = contact.name.split(' ')[0] ?? contact.name;
  const canSend = draft.trim().length > 0 && !isSending;

  const menuItems: ChatMenuItem[] = [
    {
      label: 'Análise com IA',
      icon: <Sparkles color={colors.tint} size={18} />,
      onPress: handleAnalyze,
      disabled: messages.length === 0,
    },
    { label: 'Ver contato', icon: <User color={colors.textMuted} size={18} />, onPress: handleViewContact },
    {
      label: 'Criar oportunidade com IA',
      icon: <Sparkles color={colors.tint} size={18} />,
      onPress: handleDraftOpportunity,
      disabled: messages.length === 0,
    },
    {
      label: 'Nova oportunidade',
      icon: <Target color={colors.tint} size={18} />,
      onPress: handleNewOpportunity,
    },
    {
      label: 'Excluir conversa',
      icon: <Trash2 color="#ef4444" size={18} />,
      onPress: handleDeleteChat,
      destructive: true,
    },
  ];

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white dark:bg-zinc-950"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + HEADER_APPROX_HEIGHT : 0}
      // Android edge-to-edge (see app.json) disables the native `adjustResize`, so
      // KeyboardAvoidingView can't lift the composer on its own. We pad the container
      // by the measured keyboard height instead — iOS keeps the native `padding` path.
      style={
        Platform.OS === 'android' && keyboard.visible
          ? { paddingBottom: keyboard.height }
          : undefined
      }
    >
      <Stack.Screen
        options={{
          headerTitleAlign: 'left',
          headerBackButtonDisplayMode: 'minimal',
          headerTitle: () => (
            <View className="flex-row items-center gap-2.5">
              <Avatar name={contact.name} size={34} />
              <View>
                <Text
                  numberOfLines={1}
                  className="text-[15px] font-semibold text-zinc-900 dark:text-zinc-50"
                >
                  {contact.name}
                </Text>
                <View className="flex-row items-center gap-1">
                  <View className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <Text numberOfLines={1} className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    {contact.role ? `${contact.role} · online` : 'online'}
                  </Text>
                </View>
              </View>
            </View>
          ),
          headerRight: () => (
            <Pressable
              onPress={() => setMenuOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="Mais opções"
              hitSlop={8}
              className="h-9 w-9 items-center justify-center"
            >
              <MoreHorizontal color={colors.tint} size={22} />
            </Pressable>
          ),
        }}
      />

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 16, paddingBottom: 8, flexGrow: 1 }}
        onContentSizeChange={scrollToEnd}
        keyboardShouldPersistTaps="handled"
        ListFooterComponent={isSending ? <TypingIndicator /> : null}
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center">
            <Text className="text-sm text-zinc-400">Diga olá para {firstName} 👋</Text>
          </View>
        }
      />

      <View
        // Reserve the home-indicator inset only when the keyboard is closed —
        // when it's open the keyboard already covers that area, so keeping the
        // inset would leave a dead gap between the input and the keyboard.
        style={{ paddingBottom: keyboard.visible ? 8 : insets.bottom || 8 }}
        className="bg-white px-3 pt-2 dark:bg-zinc-950"
      >
        {/* Copilot actions: draft a reply, or summarize the thread. */}
        <View className="mb-2 flex-row items-center gap-2">
          <Pressable
            onPress={handleSuggest}
            disabled={isSuggesting}
            accessibilityRole="button"
            accessibilityLabel="Sugerir resposta com IA"
            accessibilityState={{ disabled: isSuggesting, busy: isSuggesting }}
            className={`flex-row items-center gap-1.5 rounded-full bg-indigo-50 px-3.5 py-2 active:opacity-70 dark:bg-indigo-500/15 ${
              isSuggesting ? 'opacity-60' : ''
            }`}
          >
            {isSuggesting ? (
              <ActivityIndicator size="small" color={colors.tint} />
            ) : (
              <Sparkles color={colors.tint} size={14} />
            )}
            <Text className="text-[13px] font-medium text-indigo-700 dark:text-indigo-300">
              {isSuggesting ? 'Gerando…' : 'Sugerir resposta'}
            </Text>
          </Pressable>

          <Pressable
            onPress={handleSummarize}
            disabled={messages.length === 0 || isSummarizing}
            accessibilityRole="button"
            accessibilityLabel="Resumir conversa com IA"
            accessibilityState={{ disabled: messages.length === 0 || isSummarizing }}
            className={`flex-row items-center gap-1.5 rounded-full bg-indigo-50 px-3.5 py-2 active:opacity-70 dark:bg-indigo-500/15 ${
              messages.length === 0 || isSummarizing ? 'opacity-60' : ''
            }`}
          >
            {isSummarizing ? (
              <ActivityIndicator size="small" color={colors.tint} />
            ) : (
              <FileText color={colors.tint} size={14} />
            )}
            <Text className="text-[13px] font-medium text-indigo-700 dark:text-indigo-300">
              {isSummarizing ? 'Resumindo…' : 'Resumir'}
            </Text>
          </Pressable>

          {isDrafting ? (
            <View className="flex-row items-center gap-1.5 rounded-full bg-indigo-50 px-3.5 py-2 dark:bg-indigo-500/15">
              <ActivityIndicator size="small" color={colors.tint} />
              <Text className="text-[13px] font-medium text-indigo-700 dark:text-indigo-300">
                Montando oportunidade…
              </Text>
            </View>
          ) : null}
        </View>

        <View className="flex-row items-end gap-2">
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Digite uma mensagem…"
            placeholderTextColor="#a1a1aa"
            multiline
            autoFocus
            accessibilityLabel="Campo de mensagem"
            className="max-h-32 flex-1 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-base text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
          />
          <Pressable
            onPress={handleSend}
            disabled={!canSend}
            accessibilityRole="button"
            accessibilityLabel="Enviar mensagem"
            accessibilityState={{ disabled: !canSend }}
            className={`h-11 w-11 items-center justify-center rounded-full ${
              canSend ? 'bg-primary active:bg-indigo-700' : 'bg-indigo-200 dark:bg-indigo-900'
            }`}
          >
            <Send color="#ffffff" size={20} />
          </Pressable>
        </View>
      </View>

      <CopilotSummary
        visible={summaryOpen}
        loading={isSummarizing}
        summary={summary}
        onClose={handleCloseSummary}
      />

      <CopilotAnalysis
        visible={analysisOpen}
        loading={isAnalyzing}
        analysis={analysis}
        onClose={handleCloseAnalysis}
      />

      <ChatMenu visible={menuOpen} onClose={() => setMenuOpen(false)} items={menuItems} />

      <OpportunityFormModal
        visible={oppFormOpen}
        onClose={handleCloseOppForm}
        presetContactId={contact.id}
        presetTitle={dealDraft?.title}
        presetValue={dealDraft?.value}
        presetStageId={dealDraft?.stageId}
        draftRationale={dealDraft?.rationale}
        draftConfidence={dealDraft?.confidence}
      />
    </KeyboardAvoidingView>
  );
}
