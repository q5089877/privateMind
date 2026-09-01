export type FlowState = 'HOME' | 'PRESENT_SETTLED' | 'REVIEW';

/** Why this moment was added. It is supplied by the entry point, never asked as a form field. */
export type MomentIntent = 'captured' | 'reappeared' | 'follow_up' | 'context_added';
export type StorylineState = 'developing' | 'settled' | 'tucked_away';

export interface DialogueEntry {
  id: string;
  threadId: string;
  content: string;
  createdAt: number;
  intent?: MomentIntent;
  aiResponse?: string;
  relatedEntryIds?: string[];
  dismissedRelatedEntryIds?: string[];
}

/** A Storyline is a user-owned sequence of moments, not an AI conclusion. */
export interface ThoughtThread {
  id: string;
  createdAt: number;
  updatedAt: number;
  isArchived?: boolean;
  state?: StorylineState;
  entries: DialogueEntry[];
}

export interface IFlowActions {
  submitText(content: string): Promise<void>;
  appendEntry(threadId: string, content: string, intent?: MomentIntent): Promise<void>;
  attachCurrentMoment(threadId: string): Promise<void>;
  archiveThread(threadId: string): Promise<void>;
  restoreThread(threadId: string): Promise<void>;
  deleteThread(threadId: string): Promise<void>;
  reset(): void;
  transition(newState: FlowState): void;
}
