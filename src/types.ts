export type FlowState = 
  | 'HOME' 
  | 'INPUTTING' 
  | 'SHUNTTING' 
  | 'ACTION_PATH' 
  | 'REVIEW'
  | 'COMPLETED';

export type ThoughtDisposition = 'DEPOSIT' | 'ACTION' | 'RELEASE';

export interface ActionRevision {
  text: string;
  updatedAt: number;
}

export interface ActionStep {
  text: string;
  revisions?: ActionRevision[];
}

export interface ThoughtAddition {
  id: string;
  content: string;
  createdAt: number;
}

export interface Thought {
  id: string;
  content: string;
  createdAt: number;
  currentDisposition?: ThoughtDisposition;
  actionStep?: ActionStep;
  additions?: ThoughtAddition[];
  reflection?: {
    feeling?: string;
    reaction?: string;
  };
  isAwarenessRecord?: boolean;
}

export interface UnspokenEvent {
  id: string;
  timestamp: number;
}

export interface IFlowActions {
  submitInput(content: string): void;
  startDeposit(): void;
  startAction(): void;
  submitActionStep(text: string): void;
  releaseThought(thoughtId: string): Promise<void>; 
  reset(): void;
}
