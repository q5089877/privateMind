export type FlowState = 
  | 'HOME' 
  | 'PRESENT_SETTLED'
  | 'REVIEW';

export type EntryType = 'thought' | 'action';

export interface ThoughtTray {
  id: string;
  name?: string;
  aiLabel?: string;
  createdAt: number;
}

export interface DialogueEntry {
  id: string;
  threadId?: string;
  content: string;
  createdAt: number;
  type?: EntryType;
  trayId?: string; // 所屬托盤 ID，預設 undefined 代表預設堆
}

export interface ThoughtThread {
  id: string;
  createdAt: number;
  updatedAt: number;
  isArchived?: boolean;
  currentActionId?: string | null;
  trays?: ThoughtTray[]; // 該 Thread 下的空間托盤清單
  pileObservations?: string[];
  entries: DialogueEntry[];
}

export interface IFlowActions {
  submitText(content: string, type?: EntryType): Promise<void>;
  submitSayNothing(): Promise<void>;
  appendEntry(threadId: string, content: string, type?: EntryType, trayId?: string): Promise<void>;
  updateEntry(threadId: string, entryId: string, content: string): Promise<void>;
  setCurrentAction(threadId: string, entryId: string | null): Promise<void>;
  archiveThread(threadId: string): Promise<void>;
  restoreThread(threadId: string): Promise<void>;
  deleteThread(threadId: string): Promise<void>;
  createTray(threadId: string, name?: string): Promise<string>;
  moveEntryToTray(threadId: string, entryId: string, trayId: string | undefined): Promise<void>;
  ensureTrays(threadId: string, count?: number): Promise<void>;
  savePileAnalysis(threadId: string, labels: Record<string, string>, observations: string[]): Promise<void>;
  reset(): void;
  transition(newState: FlowState): void;
}
