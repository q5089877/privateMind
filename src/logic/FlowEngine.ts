import { FlowState, Thought, AppSettings, RetentionSetting, ActionDisposition, ThoughtDisposition } from '../types';
import { IStorageProvider } from './interfaces/IStorageProvider';
import { LocalStorageManager } from './StorageManager';

/**
 * MVP 遊戲架構師規範：
 * 1. OOP 優先：使用類別管理狀態機。
 * 2. 方法行數限制：所有邏輯控制在 25 行內。
 */
export class FlowEngine {
  private _state: FlowState = 'HOME';
  private currentContent: string = '';
  private currentThought: Partial<Thought> = {};
  private existingThoughtId: string | null = null;
  private settings: AppSettings = { defaultRetention: '30_DAYS', hasSetup: false };
  private storage: IStorageProvider;
  private listeners: (() => void)[] = [];

  get state(): FlowState {
    return this._state;
  }

  set state(value: FlowState) {
    this._state = value;
    this.notify();
  }

  constructor(storage?: IStorageProvider) {
    this.storage = storage || new LocalStorageManager();
    this.loadInitialData();
  }

  public subscribe(listener: () => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach(l => l());
  }

  private async loadInitialData() {
    const saved = await this.storage.getSettings();
    if (saved) {
      this.settings = saved;
    } else {
      this._state = 'SETTINGS_SETUP';
    }
    await this.purgeExpired();
    this.notify();
  }

  private async purgeExpired() {
    const now = Date.now();
    const thoughts = await this.storage.getThoughts();
    const expired = thoughts.filter(t =>
      typeof t.retentionUntil === 'number' && t.retentionUntil > 0 && t.retentionUntil < now
    );
    for (const t of expired) {
      await this.storage.deleteThought(t.id);
    }
  }

  // --- Getters ---
  getState(): FlowState { return this._state; }
  getContent(): string { return this.currentContent; }
  getThought(): Partial<Thought> { return this.currentThought; }
  getSettings(): AppSettings { return this.settings; }
  getExistingThoughtId(): string | null { return this.existingThoughtId; }

  // --- State Transitions ---
  
  public setInitialSettings(retention: RetentionSetting) {
    this.settings = { defaultRetention: retention, hasSetup: true };
    this.storage.saveSettings(this.settings);
    this.state = 'HOME';
  }

  public startInput() {
    this.state = 'INPUTTING';
  }

  public submitInput(content: string) {
    this.currentContent = content;
    this.state = 'SHUNTTING';
  }

  public async startNextStep(thoughtId: string) {
    const thoughts = await this.storage.getThoughts();
    const thought = thoughts.find(t => t.id === thoughtId);
    
    if (thought) {
      this.existingThoughtId = thoughtId;
      this.currentContent = thought.content;
      // 保持原始念頭，但清除當前步驟文字，讓 UI 呈現空白輸入
      this.currentThought = { 
        ...thought,
        actionStep: undefined 
      };
      this.state = 'ACTION_PATH';
    }
  }

  public handleAwareness() {
    this.currentContent = '（無聲覺察）';
    this.saveFinalThought('RELEASE', true);
  }

  public cancelEvolve() {
    this.existingThoughtId = null;
    this.currentThought = {};
    this.currentContent = '';
    this.state = 'REVIEW';
  }

  public startDeposit() {
    this.state = 'DEPOSIT_PATH';
  }

  public confirmDeposit() {
    this.saveFinalThought('DEPOSIT');
  }

  public startAction() {
    this.state = 'ACTION_PATH';
  }

  public defineActionStep(text: string) {
    this.currentThought.actionStep = {
      text,
      disposition: null
    };
    this.state = 'ACTION_OPTIONS';
  }

  public setActionDisposition(disposition: ActionDisposition, person?: string, scheduledAt?: string) {
    if (!this.currentThought.actionStep) {
      this.currentThought.actionStep = { text: this.currentContent, disposition: null };
    }
    
    const step = this.currentThought.actionStep;
    step.disposition = disposition;
    
    // 如果使用者沒填寫具體步驟，則使用原始內容
    if (!step.text || !step.text.trim()) {
      step.text = this.currentContent;
    }

    step.person = person;
    step.scheduledAt = scheduledAt;
    
    this.saveFinalThought('ACTION');
  }

  private async saveFinalThought(disposition: ThoughtDisposition, awarenessOnly: boolean = false) {
    if (this.existingThoughtId) {
      await this.updateExistingWithNextStep(disposition);
    } else {
      await this.createNewThought(disposition, awarenessOnly);
    }

    this.state = 'COMPLETING';
    
    setTimeout(() => {
      this.state = 'COMPLETED';
    }, 400);
  }

  private async createNewThought(disposition: ThoughtDisposition, awarenessOnly: boolean) {
    const id = typeof crypto !== 'undefined' && crypto.randomUUID 
      ? crypto.randomUUID() 
      : `thought-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

    const thought: Thought = {
      id,
      content: this.currentContent,
      createdAt: Date.now(),
      currentDisposition: disposition,
      awarenessOnly,
      retentionUntil: this.calculateRetention(),
      actionStep: this.currentThought.actionStep,
    };

    this.currentThought = thought;
    await this.storage.saveThought(thought);
  }

  private async updateExistingWithNextStep(disposition: ThoughtDisposition) {
    const thoughts = await this.storage.getThoughts();
    const thoughtIndex = thoughts.findIndex(t => t.id === this.existingThoughtId);
    
    if (thoughtIndex !== -1) {
      const originalThought = thoughts[thoughtIndex];
      const newStep = this.currentThought.actionStep;
      
      const updatedThought: Thought = {
        ...originalThought,
        actionStep: newStep,
        currentDisposition: disposition
      };

      this.currentThought = updatedThought;
      await this.storage.updateThought(updatedThought);
    }
    this.existingThoughtId = null;
  }

  private calculateRetention(): number | null {
    if (this.settings.defaultRetention === 'AWARENESS_ONLY') return 0;
    if (this.settings.defaultRetention === 'PERMANENT') return null;
    
    const days = parseInt(this.settings.defaultRetention);
    if (isNaN(days)) return null;
    return Date.now() + days * 24 * 60 * 60 * 1000;
  }

  public reset() {
    this.state = 'HOME';
    this.currentContent = '';
    this.currentThought = {};
    this.existingThoughtId = null;
  }

  public transition(newState: FlowState) {
    this.state = newState;
  }

  public async getAllThoughts(): Promise<Thought[]> {
    return await this.storage.getThoughts();
  }

  public async deleteThought(id: string) {
    await this.storage.deleteThought(id);
  }

  public async updateThought(thought: Thought) {
    await this.storage.updateThought(thought);
  }

  public saveSettings(settings: Partial<AppSettings>) {
    this.settings = { ...this.settings, ...settings };
    this.storage.saveSettings(this.settings);
  }
}
