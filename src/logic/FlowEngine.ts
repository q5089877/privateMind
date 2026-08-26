import { FlowState, ThoughtThread, DialogueEntry } from '../types';
import { IStorageProvider } from './interfaces/IStorageProvider';
import { LocalStorageManager } from './StorageManager';

/**
 * FlowEngine v3:
 * 嚴守「不要求結論，只保留對話可以繼續的可能」之憲法。
 */
export class FlowEngine {
  private _state: FlowState = 'HOME';
  private currentThread: ThoughtThread | null = null;
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
  getCurrentThread(): ThoughtThread | null { return this.currentThread; }

  // --- Actions ---

  public async submitText(content: string) {
    if (!content.trim()) return;
    const now = Date.now();
    const threadId = this.generateId('thread');
    const entryId = this.generateId('entry');

    const newThread: ThoughtThread = {
      id: threadId,
      createdAt: now,
      updatedAt: now,
      entries: [
        {
          id: entryId,
          timestamp: now,
          type: 'text',
          content: content.trim()
        }
      ]
    };

    await this.storage.saveThread(newThread);
    this.currentThread = newThread;
    this.state = 'PRESENT_SETTLED';
  }

  public async submitUnspoken() {
    const now = Date.now();
    const threadId = this.generateId('thread');
    const entryId = this.generateId('entry');

    const newThread: ThoughtThread = {
      id: threadId,
      createdAt: now,
      updatedAt: now,
      entries: [
        {
          id: entryId,
          timestamp: now,
          type: 'unspoken'
        }
      ]
    };

    await this.storage.saveThread(newThread);
    this.currentThread = newThread;
    this.state = 'PRESENT_SETTLED';
  }

  public async appendEntry(threadId: string, content: string) {
    if (!content.trim()) return;
    const threads = await this.storage.getThreads();
    const target = threads.find(t => t.id === threadId);
    if (!target) return;

    const now = Date.now();
    const newEntry: DialogueEntry = {
      id: this.generateId('entry'),
      timestamp: now,
      type: 'text',
      content: content.trim()
    };

    target.entries.push(newEntry);
    target.updatedAt = now;

    await this.storage.updateThread(target);
    if (this.currentThread?.id === threadId) {
      this.currentThread = { ...target };
      this.notify();
    }
  }

  public async releaseThread(threadId: string) {
    const threads = await this.storage.getThreads();
    const target = threads.find(t => t.id === threadId);
    if (target) {
      target.isReleased = true;
      target.updatedAt = Date.now();
      await this.storage.updateThread(target);
      if (this.currentThread?.id === threadId) {
        this.currentThread = { ...target };
        this.notify();
      }
    }
  }

  public async deleteThread(threadId: string) {
    await this.storage.deleteThread(threadId);
    if (this.currentThread?.id === threadId) {
      this.currentThread = null;
      this.notify();
    }
  }

  public async getAllThreads(): Promise<ThoughtThread[]> {
    return await this.storage.getThreads();
  }

  public reset() {
    this.state = 'HOME';
    this.currentThread = null;
  }

  public transition(newState: FlowState) {
    this.state = newState;
  }

  private generateId(prefix: string): string {
    return typeof crypto !== 'undefined' && crypto.randomUUID 
      ? crypto.randomUUID() 
      : `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }
}

