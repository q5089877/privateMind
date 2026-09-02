import { ActiveCollection, BackupStatus, FlowState, LinkCandidate, MindHarborData, Moment, MomentIntent, ThreadLine } from '../types';
import { makeBackupText, parseBackupText } from './backup';
import { findCandidate, fingerprint } from './connectionCandidates';
import { MindHarborRepository } from './MindHarborRepository';

/**
 * Coordinates user-owned state. It never asks AI to decide where a Moment belongs.
 * Every write is durable before the UI says the Moment has been left here.
 */
export class FlowEngine {
  private state: FlowState = 'HOME';
  private currentMoment: Moment | null = null;
  private activeCollection: ActiveCollection | null = null;
  private candidate: LinkCandidate | null = null;
  private storage = new MindHarborRepository();
  private listeners: (() => void)[] = [];
  private ready = false;

  constructor() { void this.initialise(); }

  public subscribe(listener: () => void) {
    this.listeners.push(listener);
    return () => { this.listeners = this.listeners.filter(item => item !== listener); };
  }

  private notify() { this.listeners.forEach(listener => listener()); }
  public getState() { return this.state; }
  public getCurrentMoment() { return this.currentMoment; }
  public getActiveCollection() { return this.activeCollection; }
  public getCandidate() { return this.candidate; }
  public isReady() { return this.ready; }

  private async initialise() {
    const data = await this.storage.getData();
    // Candidates are discovered only when a new app session begins, never after submitText.
    this.candidate = findCandidate(data.moments, data.linkDecisions);
    this.ready = true;
    this.notify();
  }

  public async submitText(content: string, intent: MomentIntent = 'captured') {
    const clean = content.trim();
    if (!clean) return;
    const moment: Moment = { id: this.id('moment'), content: clean, createdAt: Date.now(), intent };
    await this.storage.saveMoment(moment);
    this.currentMoment = moment;
    this.setState('PRESENT_SETTLED');
  }

  public async saveImmediateReply(momentId: string, reply: string) {
    const data = await this.storage.updateMoment(momentId, moment => ({ ...moment, immediateReply: reply.trim() }));
    this.currentMoment = data.moments.find(moment => moment.id === momentId) || this.currentMoment;
    this.notify();
  }

  public async getData(): Promise<MindHarborData> { return this.storage.getData(); }
  public async getMoments(): Promise<Moment[]> { return (await this.storage.getData()).moments.sort((a, b) => b.createdAt - a.createdAt); }
  public async getLines(): Promise<ThreadLine[]> { return (await this.storage.getData()).lines.sort((a, b) => b.updatedAt - a.updatedAt); }
  public async getBackupStatus(): Promise<BackupStatus> { return (await this.storage.getData()).backup; }

  public openCandidate() {
    if (!this.candidate) return;
    this.activeCollection = { kind: 'candidate', id: this.candidate.id, momentIds: this.candidate.momentIds };
    this.setState('PARALLEL');
  }

  public openLine(lineId: string) {
    void this.storage.getData().then(data => {
      const line = data.lines.find(item => item.id === lineId);
      if (!line) return;
      this.activeCollection = { kind: 'line', id: line.id, momentIds: line.momentIds };
      this.setState('PARALLEL');
    });
  }

  public async createManualLine(momentIds: string[]) {
    const uniqueIds = [...new Set(momentIds)];
    if (uniqueIds.length < 2) return;
    const now = Date.now();
    const data = await this.storage.getData();
    const existing = data.lines.find(line => line.momentIds.some(id => uniqueIds.includes(id)));
    const line: ThreadLine = existing
      ? { ...existing, momentIds: [...new Set([...existing.momentIds, ...uniqueIds])], updatedAt: now }
      : { id: this.id('line'), momentIds: uniqueIds, createdAt: now, updatedAt: now, origin: 'manual' };
    await this.storage.saveLine(line);
    this.activeCollection = { kind: 'line', id: line.id, momentIds: line.momentIds };
    this.setState('PARALLEL');
  }

  public async confirmCandidate() {
    if (!this.candidate) return;
    const now = Date.now();
    const data = await this.storage.getData();
    const existing = data.lines.find(line => line.momentIds.some(id => this.candidate!.momentIds.includes(id)));
    const line: ThreadLine = existing
      ? { ...existing, momentIds: [...new Set([...existing.momentIds, ...this.candidate.momentIds])], updatedAt: now }
      : { id: this.id('line'), momentIds: this.candidate.momentIds, createdAt: now, updatedAt: now, origin: 'confirmed_suggestion' };
    await this.storage.saveLine(line);
    await this.storage.saveDecision({ fingerprint: fingerprint(this.candidate.momentIds), decision: 'confirmed', decidedAt: now });
    this.activeCollection = { kind: 'line', id: line.id, momentIds: line.momentIds };
    this.candidate = null;
    this.notify();
  }

  public async decideCandidate(decision: 'dismissed' | 'deferred') {
    if (!this.candidate) return;
    await this.storage.saveDecision({ fingerprint: fingerprint(this.candidate.momentIds), decision, decidedAt: Date.now() });
    this.candidate = null;
    this.activeCollection = null;
    this.setState('HOME');
  }

  public closeParallel() { this.activeCollection = null; this.setState('REVIEW'); }

  public openBackup() { this.setState('BACKUP'); }

  public async exportBackup() {
    const data = await this.storage.getData();
    const text = makeBackupText(data);
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    const anchor = document.createElement('a');
    const date = new Intl.DateTimeFormat('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()).replaceAll('/', '-');
    anchor.href = url;
    anchor.download = `mind-harbor-${date}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    await this.storage.markExported();
    this.notify();
  }

  public async importBackup(text: string) {
    const incoming = parseBackupText(text);
    await this.storage.mergeImported(incoming);
    this.candidate = findCandidate((await this.storage.getData()).moments, (await this.storage.getData()).linkDecisions);
    this.notify();
  }

  public reset() { this.currentMoment = null; this.setState('HOME'); }
  public transition(next: FlowState) { this.setState(next); }
  private setState(next: FlowState) { this.state = next; this.notify(); }
  private id(prefix: string) { return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`; }
}
