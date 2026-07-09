/**
 * Centralized domain model for Nexus CRM.
 * Every interface used across the app lives here so the data contract has a
 * single source of truth (see architecture rules in the README).
 */

export interface Company {
  id: string;
  name: string;
  industry: string;
  employees: number;
  createdAt: number;
}

export interface Contact {
  id: string;
  name: string;
  email: string;
  companyId: string; // FK -> Company.id
  role?: string;
  createdAt: number;
}

export type MessageRole = 'user' | 'assistant';
export type MessageStatus = 'sending' | 'sent' | 'error';

export interface Message {
  id: string;
  chatId: string; // FK -> Chat.id
  role: MessageRole;
  text: string;
  createdAt: number;
  status: MessageStatus;
  /** User-facing failure reason. Present only when `status` is 'error'. */
  errorReason?: string;
}

export interface Chat {
  id: string;
  contactId: string; // FK -> Contact.id
  createdAt: number;
  lastMessageAt: number;
}

/** Messages are stored keyed by their owning chat id. */
export type MessagesByChat = Record<string, Message[]>;

export type OpportunityStatus = 'open' | 'won' | 'lost';

/** A stage (column) of the sales funnel. */
export interface Stage {
  id: string;
  label: string;
  color: string; // accent color for the Kanban column
}

/** A deal in the pipeline: a lead + funnel stage + owner + value + status. */
export interface Opportunity {
  id: string;
  title: string;
  contactId: string; // FK -> Contact.id
  stageId: string; // FK -> Stage.id (meaningful while status is 'open')
  owner: string; // Responsável
  value: number; // R$
  status: OpportunityStatus;
  /** Win/loss reason captured on close. */
  closeReason?: string;
  createdAt: number;
  /** When the opp last entered its current stage — powers the "stuck for X" badge. */
  stageEnteredAt: number;
}

/** The single, fixed sales funnel for v1. Colors drive the Kanban columns. */
export const FUNNEL_STAGES: Stage[] = [
  { id: 'novo', label: 'Novo', color: '#6366f1' },
  { id: 'qualificacao', label: 'Qualificação', color: '#0ea5e9' },
  { id: 'proposta', label: 'Proposta', color: '#f59e0b' },
  { id: 'negociacao', label: 'Negociação', color: '#a855f7' },
  { id: 'fechamento', label: 'Fechamento', color: '#10b981' },
];

/** Input shapes for creating records (ids and timestamps are assigned by the store). */
export type NewCompanyInput = Omit<Company, 'id' | 'createdAt'>;
export type NewContactInput = Omit<Contact, 'id' | 'createdAt'>;
export type NewOpportunityInput = {
  title: string;
  contactId: string;
  owner: string;
  value: number;
  /** Defaults to the first funnel stage when omitted. */
  stageId?: string;
};
