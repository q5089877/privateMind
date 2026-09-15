import type { PerspectiveAnswer, PerspectiveId } from '../services/coreConversation';

export type HistoryPerspectiveState = { status: 'idle' | 'loading' | 'success' | 'error'; answer: PerspectiveAnswer | null };
export type ConversationRecord = {
  id: string;
  createdAt: string;
  turns: Array<{ role: 'user' | 'assistant'; content: string; kind?: 'original' | 'supplement' }>;
  analysisContent: string;
  activePerspective: PerspectiveId;
  perspectiveStates: Record<PerspectiveId, HistoryPerspectiveState>;
};

const STORAGE_KEY = 'privateMind.conversationHistory.v1';
const MAX_RECORDS = 30;

export const loadConversationHistory = (): ConversationRecord[] => {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') as unknown;
    return Array.isArray(parsed) ? parsed.filter(item => item && typeof item === 'object').slice(0, MAX_RECORDS) as ConversationRecord[] : [];
  } catch {
    return [];
  }
};

export const saveConversationHistory = (records: ConversationRecord[]) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(records.slice(0, MAX_RECORDS))); } catch { /* local storage may be unavailable */ }
};

export const upsertConversation = (records: ConversationRecord[], record: ConversationRecord) => [
  record,
  ...records.filter(item => item.id !== record.id),
].slice(0, MAX_RECORDS);
