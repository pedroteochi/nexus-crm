import { useCallback, useState } from 'react';

import * as openai from '@/services/openai';
import type { Company, Contact, Message } from '@/types/models';

export type CopilotErrorSource = 'suggest' | 'summarize' | 'analyze' | 'draft';

/** A Copilot failure tagged with which action produced it, so the screen can
 * react to (and dismiss) only the affected surface. */
export interface CopilotError {
  source: CopilotErrorSource;
  message: string;
}

export interface UseCopilotResult {
  isSuggesting: boolean;
  isSummarizing: boolean;
  isAnalyzing: boolean;
  isDrafting: boolean;
  summary: openai.ConversationSummary | null;
  analysis: openai.ConversationAnalysis | null;
  error: CopilotError | null;
  /** Draft the rep's next message; resolves to the text, or null on error. */
  suggest: (contact: Contact, company: Company, history: Message[]) => Promise<string | null>;
  /** Summarize the thread into `summary`; errors surface via `error`. */
  summarize: (contact: Contact, company: Company, history: Message[]) => Promise<void>;
  /** Score the rep's performance into `analysis`; errors surface via `error`. */
  analyze: (contact: Contact, company: Company, history: Message[]) => Promise<void>;
  /** Draft a funnel opportunity from the thread; resolves to it, or null on error. */
  draftDeal: (
    contact: Contact,
    company: Company,
    history: Message[],
  ) => Promise<openai.DealDraft | null>;
  clearSummary: () => void;
  clearAnalysis: () => void;
  clearError: () => void;
}

/**
 * Copilot actions for a chat: draft a reply and summarize the thread. Pure AI
 * plus loading/result state — it reads no store, so the screen passes the data
 * it already resolved via {@link useChat}. Failures become a user-facing string.
 */
export const useCopilot = (): UseCopilotResult => {
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isDrafting, setIsDrafting] = useState(false);
  const [summary, setSummary] = useState<openai.ConversationSummary | null>(null);
  const [analysis, setAnalysis] = useState<openai.ConversationAnalysis | null>(null);
  const [error, setError] = useState<CopilotError | null>(null);

  const suggest = useCallback(
    async (contact: Contact, company: Company, history: Message[]): Promise<string | null> => {
      if (isSuggesting) return null;
      setError(null);
      setIsSuggesting(true);
      try {
        return await openai.suggestReply(contact, company, history);
      } catch (err) {
        console.error('[useCopilot] suggest failed', err);
        setError({ source: 'suggest', message: openai.toUserMessage(err) });
        return null;
      } finally {
        setIsSuggesting(false);
      }
    },
    [isSuggesting],
  );

  const summarize = useCallback(
    async (contact: Contact, company: Company, history: Message[]): Promise<void> => {
      if (isSummarizing) return;
      setError(null);
      setIsSummarizing(true);
      try {
        setSummary(await openai.summarizeThread(contact, company, history));
      } catch (err) {
        console.error('[useCopilot] summarize failed', err);
        setError({ source: 'summarize', message: openai.toUserMessage(err) });
      } finally {
        setIsSummarizing(false);
      }
    },
    [isSummarizing],
  );

  const analyze = useCallback(
    async (contact: Contact, company: Company, history: Message[]): Promise<void> => {
      if (isAnalyzing) return;
      setError(null);
      setIsAnalyzing(true);
      try {
        setAnalysis(await openai.analyzeConversation(contact, company, history));
      } catch (err) {
        console.error('[useCopilot] analyze failed', err);
        setError({ source: 'analyze', message: openai.toUserMessage(err) });
      } finally {
        setIsAnalyzing(false);
      }
    },
    [isAnalyzing],
  );

  const draftDeal = useCallback(
    async (
      contact: Contact,
      company: Company,
      history: Message[],
    ): Promise<openai.DealDraft | null> => {
      if (isDrafting) return null;
      setError(null);
      setIsDrafting(true);
      try {
        return await openai.draftOpportunity(contact, company, history);
      } catch (err) {
        console.error('[useCopilot] draftDeal failed', err);
        setError({ source: 'draft', message: openai.toUserMessage(err) });
        return null;
      } finally {
        setIsDrafting(false);
      }
    },
    [isDrafting],
  );

  const clearSummary = useCallback(() => setSummary(null), []);
  const clearAnalysis = useCallback(() => setAnalysis(null), []);
  const clearError = useCallback(() => setError(null), []);

  return {
    isSuggesting,
    isSummarizing,
    isAnalyzing,
    isDrafting,
    summary,
    analysis,
    error,
    suggest,
    summarize,
    analyze,
    draftDeal,
    clearSummary,
    clearAnalysis,
    clearError,
  };
};
