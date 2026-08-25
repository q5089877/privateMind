export type FlowState = 
  | 'HOME' 
  | 'INPUTTING' 
  | 'SHUNTTING' 
  | 'DEPOSIT_PATH'
  | 'ACTION_PATH' 
  | 'DEFINE_STEP'
  | 'ACTION_OPTIONS'
  | 'REVIEW'
  | 'SETTINGS_SETUP'
  | 'COMPLETING' 
  | 'COMPLETED'
  | 'RELEASED_VIEW';

export type ActionDisposition = 'SELF' | 'TOGETHER' | 'CANNOT_NOW' | 'NOT_PROCESS';
export type ThoughtDisposition = 'DEPOSIT' | 'ACTION' | 'RELEASE';

export type RetentionSetting = 'AWARENESS_ONLY' | '7_DAYS' | '30_DAYS' | '90_DAYS' | 'PERMANENT';

export interface AppSettings {
  defaultRetention: RetentionSetting;
  hasSetup: boolean;
}

export interface ActionStep {
  text: string;
  disposition: ActionDisposition | null;
  person?: string;
  scheduledAt?: string;
}

export interface Thought {
  id: string;
  content: string;
  createdAt: number;
  retentionUntil?: number | null; 
  awarenessOnly?: boolean;
  currentDisposition?: ThoughtDisposition;
  actionStep?: ActionStep;
}

export interface IFlowActions {
  submitInput(content: string): void;
  startShunting(): void;
  chooseActionPath(): void;
  defineStep(text: string): void;
  setDisposition(disposition: ActionDisposition, person?: string, scheduledAt?: string): void;
  startNextStep(thoughtId: string): Promise<void>; 
  releaseThought(thoughtId: string): Promise<void>; 
  completeFlow(): void;
  reset(): void;
}
