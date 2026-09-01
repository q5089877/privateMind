import { FlowState, ThoughtThread, DialogueEntry, MomentIntent } from '../types';
import { IStorageProvider } from './interfaces/IStorageProvider';
import { LocalStorageManager } from './StorageManager';
import { UI_TEXT } from '../config/textConfig';

/** Keeps the user's words and their order. It never decides what their story means. */
export class FlowEngine {
  private _state: FlowState = 'HOME';
  private currentThread: ThoughtThread | null = null;
  private storage: IStorageProvider;
  private listeners: (() => void)[] = [];

  constructor(storage?: IStorageProvider) { this.storage = storage || new LocalStorageManager(); }
  public subscribe(listener: () => void) { this.listeners.push(listener); return () => { this.listeners = this.listeners.filter(l => l !== listener); }; }
  private notify() { this.listeners.forEach(listener => listener()); }
  getState() { return this._state; }
  getCurrentThread() { return this.currentThread; }

  public async submitText(content: string) {
    if (!content.trim()) return;
    const now = Date.now();
    const id = this.id('storyline');
    const thread: ThoughtThread = { id, createdAt: now, updatedAt: now, state: 'developing', entries: [{ id: this.id('moment'), threadId: id, content: content.trim(), createdAt: now, intent: 'captured' }] };
    await this.storage.saveThread(thread);
    this.currentThread = thread;
    this.setState('PRESENT_SETTLED');
  }

  public async submitSayNothing() { await this.submitText(UI_TEXT.review.ineffableText); }

  public async appendEntry(threadId: string, content: string, intent: MomentIntent = 'follow_up') {
    if (!content.trim()) return;
    const thread = await this.find(threadId);
    if (!thread) return;
    const now = Date.now();
    const entry: DialogueEntry = { id: this.id('moment'), threadId, content: content.trim(), createdAt: now, intent };
    thread.entries.push(entry);
    thread.updatedAt = now;
    thread.isArchived = false;
    thread.state = 'developing';
    await this.storage.updateThread(thread);
    this.currentThread = thread;
    this.notify();
  }

  /** Turns a just-captured standalone moment into a continuation of a user-confirmed storyline. */
  public async attachCurrentMoment(targetId: string) {
    if (!this.currentThread || this.currentThread.id === targetId) return;
    const target = await this.find(targetId);
    if (!target) return;
    const moment = this.currentThread.entries[0];
    if (!moment) return;
    moment.threadId = target.id;
    moment.intent = 'follow_up';
    target.entries.push(moment);
    target.entries.sort((a, b) => a.createdAt - b.createdAt);
    target.updatedAt = moment.createdAt;
    target.state = 'developing';
    await this.storage.updateThread(target);
    await this.storage.deleteThread(this.currentThread.id);
    this.currentThread = target;
    this.notify();
  }

  public async updateEntry(threadId: string, entryId: string, content: string) {
    const thread = await this.find(threadId); const entry = thread?.entries.find(item => item.id === entryId);
    if (!thread || !entry || !content.trim()) return;
    entry.content = content.trim(); thread.updatedAt = Date.now(); await this.storage.updateThread(thread); this.notify();
  }
  public async saveReflection(threadId: string, entryId: string, response: string, relatedEntryIds: string[]) {
    const thread = await this.find(threadId); const entry = thread?.entries.find(item => item.id === entryId);
    if (!thread || !entry) return;
    entry.aiResponse = response.trim();
    entry.relatedEntryIds = relatedEntryIds;
    thread.updatedAt = Date.now();
    await this.storage.updateThread(thread);
    if (this.currentThread?.id === threadId) this.currentThread = thread;
    this.notify();
  }
  public async archiveThread(threadId: string) { const thread = await this.find(threadId); if (!thread) return; thread.isArchived = true; thread.state = 'tucked_away'; thread.updatedAt = Date.now(); await this.storage.updateThread(thread); this.notify(); }
  public async restoreThread(threadId: string) { const thread = await this.find(threadId); if (!thread) return; thread.isArchived = false; thread.state = 'developing'; thread.updatedAt = Date.now(); await this.storage.updateThread(thread); this.notify(); }
  public async deleteThread(threadId: string) { await this.storage.deleteThread(threadId); if (this.currentThread?.id === threadId) this.currentThread = null; this.notify(); }
  public async getAllThreads() { return this.storage.getThreads(); }
  public reset() { this.currentThread = null; this.setState('HOME'); }
  public transition(state: FlowState) { this.setState(state); }
  private setState(state: FlowState) { this._state = state; this.notify(); }
  private async find(id: string) { return (await this.storage.getThreads()).find(item => item.id === id); }
  private id(prefix: string) { return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`; }
}
