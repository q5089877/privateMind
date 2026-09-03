import { MindHarborRepository } from '../data/MindHarborRepository';
import { ActiveCollection, BackupStatus, HarborSession, LinkCandidate, MemoryReading, MindHarborData, Moment, MomentIntent, SessionClosure, SessionClosureDraft, ThreadLine, TimelineInsight } from '../domain/harbor';
import { fingerprint } from '../logic/connectionCandidates';
import { BackupService } from '../services/backup/BackupService';
import { CompanionService } from '../services/ai/CompanionService';
import { MemoryService } from '../services/memory/MemoryService';
import { HarborIntent, HarborUserIntent } from '../state/harborIntent';
import { harborReducer } from '../state/harborReducer';
import { HarborAppState, initialHarborState } from '../state/harborState';

/**
 * MVI application store. UI sends intentions to this engine; all durable writes and
 * asynchronous AI work happen here or in services, never inside a React component.
 */
export class HarborFlowEngine {
  private snapshot: HarborAppState = initialHarborState;
  private readonly storage = new MindHarborRepository();
  private readonly memory = new MemoryService();
  private readonly companion = new CompanionService();
  private readonly backup = new BackupService();
  private listeners: Array<() => void> = [];
  private readonly presentReplyRequests = new Map<string, Promise<string | null>>();

  constructor() { void this.initialise(); }

  public subscribe(listener: () => void) {
    this.listeners.push(listener);
    return () => { this.listeners = this.listeners.filter(item => item !== listener); };
  }

  public getSnapshot(): HarborAppState { return this.snapshot; }
  // Compatibility readers keep the current UI stable while it is progressively rebuilt.
  public getState() { return this.snapshot.screen; }
  public getCurrentMoment() { return this.snapshot.currentMoment; }
  public getCurrentSession() { return this.snapshot.currentSession; }
  public getActiveCollection() { return this.snapshot.activeCollection; }
  public getCandidate() { return this.snapshot.candidate; }
  public canOpenDiscovery() { return this.snapshot.canDiscover; }
  public isReady() { return this.snapshot.ready; }

  private dispatch(intent: HarborIntent) {
    this.snapshot = harborReducer(this.snapshot, intent);
    this.listeners.forEach(listener => listener());
  }

  /** Stable MVI entry point for the next UI iteration. Compatibility methods remain below. */
  public async handle(intent: HarborUserIntent): Promise<string | SessionClosure | null | void> {
    switch (intent.type) {
      case 'CAPTURE_MOMENT': return this.submitText(intent.content, intent.intent);
      case 'REQUEST_PRESENT_REPLY': return this.requestPresentReply(intent.moment);
      case 'REQUEST_SESSION_CLOSURE': return this.requestSessionClosure(intent.session);
      case 'SAVE_PRESENT_REPLY': return this.saveImmediateReply(intent.momentId, intent.reply);
      case 'SAVE_CLOSURE': return this.saveClosure(intent.sessionId, intent.closure);
      case 'OPEN_DISCOVERY': return this.openDiscovery();
      case 'OPEN_BACKUP': return this.openBackup();
      case 'RETURN_HOME': return this.reset();
      default: return undefined;
    }
  }

  private async initialise() {
    try {
      const data = await this.storage.getData();
      this.dispatch({ type: 'HYDRATED', candidate: this.memory.findQuietCandidate(data.moments, data.linkDecisions), canDiscover: this.memory.canReviewAcrossTime(data.moments) });
    } catch {
      this.dispatch({ type: 'SET_REQUEST', request: 'idle', error: '無法讀取這台裝置的資料。' });
    }
  }

  /** Capture is durable before the UI says the thought has been left here. */
  public async submitText(content: string, intent: MomentIntent = 'captured') {
    const clean = content.trim();
    if (!clean) return;
    this.dispatch({ type: 'SET_REQUEST', request: 'saving' });
    const moment: Moment = { id: this.id('moment'), content: clean, createdAt: Date.now(), intent };
    const session = this.createOrContinueSession(moment);
    await this.storage.saveMomentWithSession(moment, session);
    // A just-captured thought is never followed by an automatic prompt about the past.
    this.dispatch({ type: 'MOMENT_CAPTURED', moment, session, canDiscover: false });
  }

  /** An effect entry point: components ask for a reply but never import an AI client. */
  public async requestPresentReply(moment: Moment): Promise<string | null> {
    const existing = this.presentReplyRequests.get(moment.id);
    if (existing) return existing;
    this.dispatch({ type: 'SET_REQUEST', request: 'thinking' });
    const request = this.companion.replyToPresentMoment(moment).then(reply => {
      this.dispatch(reply
        ? { type: 'SET_REQUEST', request: 'idle' }
        : { type: 'SET_REQUEST', request: 'idle', error: '回應暫時沒有連上。' });
      return reply;
    }).finally(() => this.presentReplyRequests.delete(moment.id));
    this.presentReplyRequests.set(moment.id, request);
    return request;
  }

  /** The user explicitly asks to pause this session; only its visible turns are shared. */
  public async requestSessionClosure(session: HarborSession): Promise<SessionClosure | null> {
    this.dispatch({ type: 'SET_REQUEST', request: 'thinking' });
    const draft: SessionClosureDraft | null = await this.companion.closeSession(session);
    this.dispatch({ type: 'SET_REQUEST', request: 'idle', ...(draft ? {} : { error: '暫時無法整理這段對話。' }) });
    return draft ? {
      ...draft,
      createdAt: Date.now(),
      sourceTurnIds: session.turns.filter(turn => turn.role === 'user').map(turn => turn.id)
    } : null;
  }

  /** Explicit review effect: the complete recent timeline is read only after this call. */
  public async requestMemoryReading(): Promise<MemoryReading | null> {
    this.dispatch({ type: 'SET_REQUEST', request: 'thinking' });
    const reading = await this.memory.findEvidenceBackedReading((await this.storage.getData()).moments);
    this.dispatch({ type: 'SET_REQUEST', request: 'idle', ...(reading ? {} : { error: undefined }) });
    return reading;
  }

  /** Reads only the moment ids in a confirmed/manual line, never the whole history. */
  public async requestTimelineInsight(momentIds: string[]): Promise<TimelineInsight | null> {
    this.dispatch({ type: 'SET_REQUEST', request: 'thinking' });
    const byId = new Map((await this.storage.getData()).moments.map(moment => [moment.id, moment]));
    const insight = await this.memory.readTimeline(momentIds.map(id => byId.get(id)).filter((moment): moment is Moment => Boolean(moment)));
    this.dispatch({ type: 'SET_REQUEST', request: 'idle', ...(insight ? {} : { error: undefined }) });
    return insight;
  }

  public async saveImmediateReply(momentId: string, reply: string) {
    const clean = reply.trim();
    if (!clean) return;
    const data = await this.storage.getData();
    const storedMoment = data.moments.find(moment => moment.id === momentId) || null;
    const storedSession = this.findSessionForMoment(data, momentId);
    if (!storedMoment) return;
    const session = storedSession ? this.appendAssistantTurn(storedSession, momentId, clean) : null;
    const next = session
      ? await this.storage.saveReplyAndSession(momentId, clean, session)
      : await this.storage.updateMoment(momentId, moment => ({ ...moment, immediateReply: clean }));
    this.dispatch({
      type: 'MOMENT_REPLY_SAVED',
      moment: next.moments.find(moment => moment.id === momentId) || null,
      session: session ? next.sessions.find(item => item.id === session.id) || session : null
    });
  }

  /** UI for this arrives later; the durable domain operation is ready now. */
  public async saveClosure(sessionId: string, closure: SessionClosure) {
    const data = await this.storage.getData();
    const current = data.sessions.find(session => session.id === sessionId);
    if (!current) return;
    const session: HarborSession = { ...current, status: 'landed', closure, updatedAt: Date.now() };
    await this.storage.saveSession(session);
    this.dispatch({ type: 'SESSION_UPDATED', session });
  }

  /** Future retrieval must always be explicit and recorded on the session. */
  public async recordRecalledMoments(sessionId: string, momentIds: string[]) {
    const data = await this.storage.getData();
    const current = data.sessions.find(session => session.id === sessionId);
    if (!current) return;
    const session: HarborSession = { ...current, recalledMomentIds: [...new Set([...current.recalledMomentIds, ...momentIds])], updatedAt: Date.now() };
    await this.storage.saveSession(session);
    this.dispatch({ type: 'SESSION_UPDATED', session });
  }

  public async getData(): Promise<MindHarborData> { return this.storage.getData(); }
  public async getMoments(): Promise<Moment[]> { return (await this.storage.getData()).moments.sort((a, b) => b.createdAt - a.createdAt); }
  public async getSessions(): Promise<HarborSession[]> { return (await this.storage.getData()).sessions.sort((a, b) => b.updatedAt - a.updatedAt); }
  public async getLines(): Promise<ThreadLine[]> { return (await this.storage.getData()).lines.sort((a, b) => b.updatedAt - a.updatedAt); }
  public async getBackupStatus(): Promise<BackupStatus> { return (await this.storage.getData()).backup; }

  public openCandidate() {
    const candidate = this.snapshot.candidate;
    if (!candidate) return;
    this.dispatch({ type: 'COLLECTION_OPENED', collection: { kind: 'candidate', id: candidate.id, momentIds: candidate.momentIds } });
  }

  public openDiscovery() {
    if (this.snapshot.canDiscover) this.dispatch({ type: 'SET_SCREEN', screen: 'DISCOVERY' });
  }

  public openLine(lineId: string) {
    void this.storage.getData().then(data => {
      const line = data.lines.find(item => item.id === lineId);
      if (line) this.dispatch({ type: 'COLLECTION_OPENED', collection: { kind: 'line', id: line.id, momentIds: line.momentIds } });
    });
  }

  public async createManualLine(momentIds: string[]) {
    const line = await this.upsertLine(momentIds, 'manual');
    if (line) this.dispatch({ type: 'COLLECTION_OPENED', collection: { kind: 'line', id: line.id, momentIds: line.momentIds } });
  }

  public async confirmCandidate() {
    const candidate = this.snapshot.candidate;
    if (!candidate) return;
    const line = await this.upsertLine(candidate.momentIds, 'confirmed_suggestion');
    await this.storage.saveDecision({ fingerprint: fingerprint(candidate.momentIds), decision: 'confirmed', decidedAt: Date.now() });
    this.dispatch({ type: 'CANDIDATE_UPDATED', candidate: null });
    if (line) this.dispatch({ type: 'COLLECTION_OPENED', collection: { kind: 'line', id: line.id, momentIds: line.momentIds } });
  }

  public async decideCandidate(decision: 'dismissed' | 'deferred') {
    const candidate = this.snapshot.candidate;
    if (!candidate) return;
    await this.storage.saveDecision({ fingerprint: fingerprint(candidate.momentIds), decision, decidedAt: Date.now() });
    this.dispatch({ type: 'CANDIDATE_UPDATED', candidate: null });
    this.dispatch({ type: 'RESET_TO_HOME' });
  }

  public closeParallel() { this.dispatch({ type: 'COLLECTION_CLOSED' }); }
  public openBackup() { this.dispatch({ type: 'SET_SCREEN', screen: 'BACKUP' }); }

  public async exportBackup() {
    const data = await this.storage.getData();
    this.backup.download(this.backup.createText(data));
    await this.storage.markExported();
    this.dispatch({ type: 'SET_REQUEST', request: 'idle' });
  }

  public async importBackup(text: string) {
    this.dispatch({ type: 'SET_REQUEST', request: 'restoring' });
    const incoming = this.backup.parse(text);
    const merged = await this.storage.mergeImported(incoming);
    this.dispatch({ type: 'CANDIDATE_UPDATED', candidate: this.memory.findQuietCandidate(merged.moments, merged.linkDecisions), canDiscover: this.memory.canReviewAcrossTime(merged.moments) });
    this.dispatch({ type: 'SET_REQUEST', request: 'idle' });
  }

  public reset() { this.dispatch({ type: 'RESET_TO_HOME' }); }
  public transition(screen: HarborAppState['screen']) { this.dispatch({ type: 'SET_SCREEN', screen }); }

  private createOrContinueSession(moment: Moment): HarborSession {
    const active = this.snapshot.currentSession;
    const userTurn = { id: this.id('turn'), role: 'user' as const, content: moment.content, createdAt: moment.createdAt, momentId: moment.id };
    if (moment.intent === 'follow_up' && active?.status === 'active') {
      return { ...active, momentIds: [...new Set([...active.momentIds, moment.id])], turns: [...active.turns, userTurn], updatedAt: moment.createdAt };
    }
    return { id: this.id('session'), originMomentId: moment.id, momentIds: [moment.id], turns: [userTurn], recalledMomentIds: [], status: 'active', createdAt: moment.createdAt, updatedAt: moment.createdAt };
  }

  private appendAssistantTurn(session: HarborSession, momentId: string, content: string): HarborSession {
    const exists = session.turns.some(turn => turn.role === 'assistant' && turn.momentId === momentId && turn.content === content);
    if (exists) return session;
    return { ...session, turns: [...session.turns, { id: this.id('turn'), role: 'assistant', content, createdAt: Date.now(), momentId }], updatedAt: Date.now() };
  }

  private findSessionForMoment(data: MindHarborData, momentId: string): HarborSession | null {
    return data.sessions.find(session => session.momentIds.includes(momentId)) || null;
  }

  private async upsertLine(momentIds: string[], origin: ThreadLine['origin']): Promise<ThreadLine | null> {
    const uniqueIds = [...new Set(momentIds)];
    if (uniqueIds.length < 2) return null;
    const now = Date.now();
    const data = await this.storage.getData();
    const existing = data.lines.find(line => line.momentIds.some(id => uniqueIds.includes(id)));
    const line: ThreadLine = existing
      ? { ...existing, momentIds: [...new Set([...existing.momentIds, ...uniqueIds])], updatedAt: now }
      : { id: this.id('line'), momentIds: uniqueIds, createdAt: now, updatedAt: now, origin };
    await this.storage.saveLine(line);
    return line;
  }

  private id(prefix: string) {
    return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }
}
