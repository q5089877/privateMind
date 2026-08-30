import { FlowState, ThoughtThread, DialogueEntry, EntryType } from '../types';
import { IStorageProvider } from './interfaces/IStorageProvider';
import { LocalStorageManager } from './StorageManager';
import { UI_TEXT } from '../config/textConfig';

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

  public async submitText(content: string, type: EntryType = 'thought') {
    if (!content.trim()) return;
    const now = Date.now();
    const threadId = this.generateId('thread');
    const entryId = this.generateId('entry');

    const newThread: ThoughtThread = {
      id: threadId,
      createdAt: now,
      updatedAt: now,
      currentActionId: type === 'action' ? entryId : null,
      entries: [
        {
          id: entryId,
          threadId,
          createdAt: now,
          content: content.trim(),
          type
        }
      ]
    };

    await this.storage.saveThread(newThread);
    this.currentThread = newThread;
    this.state = 'PRESENT_SETTLED';
  }

  /**
   * 08｜我現在說不上來
   * 完整合法的停靠狀態：安放「說不上來……」
   */
  public async submitSayNothing() {
    const now = Date.now();
    const threadId = this.generateId('thread');
    const entryId = this.generateId('entry');

    const newThread: ThoughtThread = {
      id: threadId,
      createdAt: now,
      updatedAt: now,
      currentActionId: null,
      entries: [
        {
          id: entryId,
          threadId,
          createdAt: now,
          content: UI_TEXT.review.ineffableText,
          type: 'thought'
        }
      ]
    };

    await this.storage.saveThread(newThread);
    this.currentThread = newThread;
    this.state = 'PRESENT_SETTLED';
  }

  public async appendEntry(threadId: string, content: string, type: EntryType = 'thought') {
    if (!content.trim()) return;
    const threads = await this.storage.getThreads();
    const target = threads.find(t => t.id === threadId);
    if (!target) return;

    const now = Date.now();
    const entryId = this.generateId('entry');
    const newEntry: DialogueEntry = {
      id: entryId,
      threadId,
      createdAt: now,
      content: content.trim(),
      type
    };

    target.entries.push(newEntry);
    if (type === 'action') {
      target.currentActionId = entryId;
    }
    // 18｜在已收起內容續寫，該 Thread 自動放回眼前（回到正常時間線）
    target.isArchived = false;
    target.updatedAt = now;

    await this.storage.updateThread(target);
    if (this.currentThread?.id === threadId) {
      this.currentThread = { ...target };
      this.notify();
    }
  }

  /**
   * 修改 Entry 內容（支援修改時間軸最後一次留言）
   */
  public async updateEntry(threadId: string, entryId: string, content: string) {
    if (!content.trim()) return;
    const threads = await this.storage.getThreads();
    const target = threads.find(t => t.id === threadId);
    if (!target) return;

    const entry = target.entries.find(e => e.id === entryId);
    if (!entry) return;

    entry.content = content.trim();
    target.updatedAt = Date.now();

    await this.storage.updateThread(target);
    if (this.currentThread?.id === threadId) {
      this.currentThread = { ...target };
      this.notify();
    }
  }

  public async setCurrentAction(threadId: string, entryId: string | null) {
    const threads = await this.storage.getThreads();
    const target = threads.find(t => t.id === threadId);
    if (!target) return;

    target.currentActionId = entryId;
    target.updatedAt = Date.now();

    await this.storage.updateThread(target);
    if (this.currentThread?.id === threadId) {
      this.currentThread = { ...target };
      this.notify();
    }
  }

  public async archiveThread(threadId: string) {
    const threads = await this.storage.getThreads();
    const target = threads.find(t => t.id === threadId);
    if (!target) return;

    target.isArchived = true;
    target.updatedAt = Date.now();

    await this.storage.updateThread(target);
    if (this.currentThread?.id === threadId) {
      this.currentThread = { ...target };
      this.notify();
    }
  }

  public async restoreThread(threadId: string) {
    const threads = await this.storage.getThreads();
    const target = threads.find(t => t.id === threadId);
    if (!target) return;

    target.isArchived = false;
    target.updatedAt = Date.now();

    await this.storage.updateThread(target);
    if (this.currentThread?.id === threadId) {
      this.currentThread = { ...target };
      this.notify();
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

