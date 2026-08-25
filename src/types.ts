export type FlowState = 
  | 'HOME' 
  | 'INPUTTING' 
  | 'SHUNTTING' 
  | 'DEPOSIT_PATH'
  | 'ACTION_PATH' 
  | 'REVIEW'
  | 'SETTINGS_SETUP' 
  | 'COMPLETING' 
  | 'COMPLETED'
  | 'RELEASED_VIEW';

export type ThoughtDisposition = 'DEPOSIT' | 'ACTION' | 'RELEASE';

export type RetentionSetting = 'AWARENESS_ONLY' | '7_DAYS' | '30_DAYS' | '90_DAYS' | 'PERMANENT';

export interface AppSettings {
  defaultRetention: RetentionSetting;
  hasSetup: boolean;
}

export interface ActionStep {
  text: string;
}

export interface ThoughtAddition {
  id: string;
  content: string;
  createdAt: number;
  actionStep?: ActionStep;
}

export interface Thought {
  id: string;
  content: string;
  createdAt: number;
  retentionUntil?: number | null; 
  awarenessOnly?: boolean;
  currentDisposition?: ThoughtDisposition;
  actionStep?: ActionStep;
  additions?: ThoughtAddition[];
}

export interface IFlowActions {
  submitInput(content: string): void;
  startDeposit(): void;
  confirmDeposit(): void;
  startAction(): void;
  submitActionStep(text: string): void;
  releaseThought(thoughtId: string): Promise<void>; 
  reset(): void;
}
