export type FlowState = 
  | 'HOME' 
  | 'INPUTTING' 
  | 'SHUNTTING' 
  | 'ACTION_PATH' 
  | 'REVIEW'
  | 'SETTINGS_SETUP' 
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
  reflection?: {
    feeling?: string;
    reaction?: string;
  };
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
  reflection?: {
    feeling?: string;
    reaction?: string;
  };
}

export interface IFlowActions {
  submitInput(content: string): void;
  startDeposit(): void;
  startAction(): void;
  submitActionStep(text: string): void;
  releaseThought(thoughtId: string): Promise<void>; 
  reset(): void;
}
