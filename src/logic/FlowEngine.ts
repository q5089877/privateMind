import { FlowState, Thought, ThoughtDisposition } from '../types';
import { IStorageProvider } from './interfaces/IStorageProvider';
import { LocalStorageManager } from './StorageManager';

/**
 * MVP 架構規範：
 * 1. OOP 優先：使用類別管理狀態機。
 * 2. 嚴守產品憲法邊界：非生產力、認知減載。
 */
export class FlowEngine {
  private _state: FlowState = 'HOME';
  private currentContent: string = '';
  private currentThought: Partial<Thought> = {};
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

  // --- Getters ---
  getState(): FlowState { return this._state; }
  getContent(): string { return this.currentContent; }
  getThought(): Partial<Thought> { return this.currentThought; }

  // --- State Transitions ---

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

  public async handleAwareness() {
    const thoughts = await this.storage.getThoughts();
    const existing = thoughts.find(t => t.isAwarenessRecord);
    const now = Date.now();

    if (existing) {
      existing.awarenessTimestamps = [...(existing.awarenessTimestamps || []), now];
      existing.createdAt = now;
      await this.storage.updateThought(existing);
      this.currentThought = existing;
    } else {
      const newRecord: Thought = {
        id: typeof crypto !== 'undefined' && crypto.randomUUID 
          ? crypto.randomUUID() 
          : `awareness-${now}`,
        content: '',
        createdAt: now,
        currentDisposition: 'DEPOSIT',
        isAwarenessRecord: true,
        awarenessTimestamps: [now],
        additions: []
      };
      await this.storage.saveThought(newRecord);
      this.currentThought = newRecord;
    }

    this.state = 'COMPLETED';
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

  private async saveFinalThought(disposition: ThoughtDisposition) {
    await this.createNewThought(disposition);
    this.state = 'COMPLETED';
  }

  private async createNewThought(disposition: ThoughtDisposition) {
    const id = typeof crypto !== 'undefined' && crypto.randomUUID 
      ? crypto.randomUUID() 
      : `thought-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

    const thought: Thought = {
      id,
      content: this.currentContent,
      createdAt: Date.now(),
      currentDisposition: disposition,
      actionStep: this.currentThought.actionStep,
      additions: []
    };

    this.currentThought = thought;
    await this.storage.saveThought(thought);
  }

  public reset() {
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
}
