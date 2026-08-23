
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
  | 'COMPLETED';

export type ActionCategory = 'A' | 'B' | 'C' | 'D';

export type RetentionSetting = 'AWARENESS_ONLY' | '7_DAYS' | '30_DAYS' | '90_DAYS' | 'PERMANENT';

export interface AppSettings {
  defaultRetention: RetentionSetting;
  hasSetup: boolean;
}

export interface ActionStep {
  text: string;
  category: ActionCategory | null;
  subOption?: string;
  assignee?: string;
  extraContent?: string; 
  isCompleted?: boolean;
  completedAt?: number; // 新增：記錄完成時間
  lastReviewAt?: number;
}

export interface Thought {
  id: string;
  content: string;
  createdAt: number;
  type: 'AWARENESS' | 'DEPOSIT' | 'ACTION';
  retentionUntil?: number | null; 
  actionStep?: ActionStep;
  stepHistory?: ActionStep[]; // 新增：單線歷史紀錄，不形成樹狀結構
}

/**
 * 為了符合架構師規範，我們在核心層定義事件處理介面
 */
export interface IFlowActions {
  submitInput(content: string): void;
  startShunting(): void;
  depositDirectly(): void;
  chooseActionPath(): void;
  defineStep(text: string): void;
  setCategory(category: ActionCategory): void;
  startNextStep(thoughtId: string): Promise<void>; // 更新：改為非同步，確保狀態切換完成
  completeFlow(): void;
  reset(): void;
}
