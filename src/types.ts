export type FlowState = 
  | 'HOME' 
  | 'INPUTTING' 
  | 'SHUNTTING' 
  | 'ACTION_PATH' 
  | 'REVIEW'
  | 'COMPLETED';

export type ThoughtDisposition = 'DEPOSIT' | 'ACTION' | 'RELEASE';

export interface ActionStep {
  text: string;
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
  awarenessTimestamps?: number[];
}

export interface IFlowActions {
  submitInput(content: string): void;
  startDeposit(): void;
  startAction(): void;
  submitActionStep(text: string): void;
  releaseThought(thoughtId: string): Promise<void>; 
  reset(): void;
}
