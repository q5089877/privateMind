export type FlowState = 
  | 'HOME' 
  | 'PRESENT_SETTLED'
  | 'REVIEW';

export interface DialogueEntry {
  id: string;
  threadId?: string;
  content: string;
  createdAt: number;
}

export interface ThoughtThread {
  id: string;
  createdAt: number;
  updatedAt: number;
  entries: DialogueEntry[];
}

export interface IFlowActions {
  submitText(content: string): Promise<void>;
  appendEntry(threadId: string, content: string): Promise<void>;
  deleteThread(threadId: string): Promise<void>;
  reset(): void;
  transition(newState: FlowState): void;
}

