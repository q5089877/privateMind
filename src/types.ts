export type FlowState = 
  | 'HOME' 
  | 'PRESENT_SETTLED'
  | 'REVIEW';

export type EntryType = 'thought' | 'action';

export interface DialogueEntry {
  id: string;
  threadId?: string;
  content: string;
  createdAt: number;
  type?: EntryType;
}

export interface ThoughtThread {
  id: string;
  createdAt: number;
  updatedAt: number;
  isArchived?: boolean;
  currentActionId?: string | null;
  entries: DialogueEntry[];
}

export interface IFlowActions {
  submitText(content: string, type?: EntryType): Promise<void>;
  submitSayNothing(): Promise<void>;
  appendEntry(threadId: string, content: string, type?: EntryType): Promise<void>;
  updateEntry(threadId: string, entryId: string, content: string): Promise<void>;
  setCurrentAction(threadId: string, entryId: string | null): Promise<void>;
  archiveThread(threadId: string): Promise<void>;
  restoreThread(threadId: string): Promise<void>;
  deleteThread(threadId: string): Promise<void>;
  reset(): void;
  transition(newState: FlowState): void;
}

