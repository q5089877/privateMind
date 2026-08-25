import { FlowState, Thought, AppSettings, RetentionSetting, ThoughtDisposition } from '../types';
import { IStorageProvider } from './interfaces/IStorageProvider';
import { LocalStorageManager } from './StorageManager';

/**
 * MVP 架構規範：
 * 1. OOP 優先：使用類別管理狀態機。
 * 2. 方法行數限制：所有邏輯控制在 25 行內。
 */
export class FlowEngine {
  private _state: FlowState = 'HOME';
  private currentContent: string = '';
  private currentThought: Partial<Thought> = {};
  private settings: AppSettings = { defaultRetention: '30_DAYS', hasSetup: false };
  private storage: IStorageProvider;
  private listeners: (() => void)[] = [];
  private completionTimer: ReturnType<typeof setTimeout> | null = null;

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
    if (expired.length > 0) {
      await this.storage.deleteThoughts(expired.map(t => t.id));
    }
  }

  // --- Getters ---
  getState(): FlowState { return this._state; }
  getContent(): string { return this.currentContent; }
  getThought(): Partial<Thought> { return this.currentThought; }
  getSettings(): AppSettings { return this.settings; }

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

  public async releaseThought(thoughtId: string) {
    const thoughts = await this.storage.getThoughts();
    const thought = thoughts.find(t => t.id === thoughtId);
    if (thought) {
      thought.currentDisposition = 'RELEASE';
      await this.storage.updateThought(thought);
    }
  }

  public handleAwareness() {
    this.currentContent = '（無聲覺察）';
    this.saveFinalThought('RELEASE', true);
  }

  public startDeposit() {
    this.saveFinalThought('DEPOSIT');
  }

  public startAction() {
    this.state = 'ACTION_PATH';
  }

  public submitActionStep(text: string) {
    const finalText = text.trim() || this.currentContent;
    this.currentThought.actionStep = { text: finalText };
    this.saveFinalThought('ACTION');
  }

  private async saveFinalThought(disposition: ThoughtDisposition, awarenessOnly: boolean = false) {
    await this.createNewThought(disposition, awarenessOnly);

    this.state = 'COMPLETING';
    
    if (this.completionTimer) {
      clearTimeout(this.completionTimer);
    }
    this.completionTimer = setTimeout(() => {
      this.state = 'COMPLETED';
      this.completionTimer = null;
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
      additions: []
    };

    this.currentThought = thought;
    await this.storage.saveThought(thought);
  }

  private calculateRetention(): number | null {
    if (this.settings.defaultRetention === 'AWARENESS_ONLY') return 0;
    if (this.settings.defaultRetention === 'PERMANENT') return null;
    
    const days = parseInt(this.settings.defaultRetention);
    if (isNaN(days)) return null;
    return Date.now() + days * 24 * 60 * 60 * 1000;
  }

  public reset() {
    if (this.completionTimer) {
      clearTimeout(this.completionTimer);
      this.completionTimer = null;
    }
    this.state = 'HOME';
    this.currentContent = '';
    this.currentThought = {};
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
    if (this.currentThought.id === thought.id) {
      this.currentThought = thought;
      this.notify();
    }
  }

  public saveSettings(settings: Partial<AppSettings>) {
    this.settings = { ...this.settings, ...settings };
    this.storage.saveSettings(this.settings);
  }
}
