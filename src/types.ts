export type FlowState = 
  | 'HOME' 
  | 'PRESENT_SETTLED'
  | 'REVIEW';

export type DialogueEntry =
  | {
      id: string;
      timestamp: number;
      type: 'text';
      content: string;
    }
  | {
      id: string;
      timestamp: number;
      type: 'unspoken';
    };

export interface ThoughtThread {
  id: string;
  createdAt: number;
  updatedAt: number;
  isReleased?: boolean;
  entries: DialogueEntry[];
}

export interface IFlowActions {
  submitText(content: string): Promise<void>;
  submitUnspoken(): Promise<void>;
  appendEntry(threadId: string, content: string): Promise<void>;
  releaseThread(threadId: string): Promise<void>; 
  deleteThread(threadId: string): Promise<void>;
  reset(): void;
  transition(newState: FlowState): void;
}

