import { MindHarborRepository } from '../data/MindHarborRepository';
import { BackupOverview, BackupStatus, ExploreGroup, ExploreResult, HarborSession, MindHarborData, Moment, MomentIntent, ReviewReading, SessionClosure, SessionClosureDraft } from '../domain/harbor';
import { BackupService } from '../services/backup/BackupService';
import { CompanionService } from '../services/ai/CompanionService';
import { MemoryService } from '../services/memory/MemoryService';
import { HarborIntent, HarborUserIntent } from '../state/harborIntent';
import { harborReducer } from '../state/harborReducer';
import { HarborAppState, initialHarborState } from '../state/harborState';

/**
 * The single MVI coordinator. UI sends a human intent here; persistence and AI
 * effects happen here or in services, never inside a screen component.
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
  public isReady() { return this.snapshot.ready; }

  private dispatch(intent: HarborIntent) {
    this.snapshot = harborReducer(this.snapshot, intent);
    this.listeners.forEach(listener => listener());
  }

  public async handle(intent: HarborUserIntent): Promise<string | SessionClosure | ReviewReading | null | void> {
    switch (intent.type) {
      case 'CAPTURE_MOMENT': return this.submitText(intent.content, intent.intent);
      case 'REQUEST_PRESENT_REPLY': return this.requestPresentReply(intent.moment);
      case 'SAVE_PRESENT_REPLY': return this.saveImmediateReply(intent.momentId, intent.reply);
      case 'BEGIN_LANDING': return this.beginLanding(intent.session);
      case 'SAVE_LANDING': return this.completeLanding(intent.sessionId, intent.closure);
      case 'OPEN_BACKUP': return this.openBackup();
      case 'RETURN_HOME': return this.reset();
      default: return undefined;
    }
  }

  private async initialise() {
    try {
      await this.storage.getData();
      this.dispatch({ type: 'HYDRATED' });
    } catch {
      this.dispatch({ type: 'SET_REQUEST', request: 'idle', error: '無法讀取這台裝置的資料。' });
    }
  }

  /** A Moment is durable before CHAT is ever shown. */
  public async submitText(content: string, intent: MomentIntent = 'captured') {
    const clean = content.trim();
    if (!clean) return;
    this.dispatch({ type: 'SET_REQUEST', request: 'saving' });
    const moment: Moment = { id: this.id('moment'), content: clean, createdAt: Date.now(), intent };
    const session = this.createOrContinueSession(moment);
    await this.storage.saveMomentWithSession(moment, session);
    this.dispatch({ type: 'MOMENT_CAPTURED', moment, session });
  }

  /** Present Companion reads one current Moment with in-session context, and no past cross-session history. */
  public async requestPresentReply(moment: Moment, session?: HarborSession): Promise<string | null> {
    const existing = this.presentReplyRequests.get(moment.id);
    if (existing) return existing;
    const activeSession = session || this.snapshot.currentSession || undefined;
    this.dispatch({ type: 'SET_REQUEST', request: 'thinking' });
    const request = this.companion.replyToPresentMoment(moment, activeSession).then(reply => {
      this.dispatch(reply
        ? { type: 'SET_REQUEST', request: 'idle' }
        : { type: 'SET_REQUEST', request: 'idle', error: '回應暫時沒有連上。' });
      return reply;
    }).finally(() => this.presentReplyRequests.delete(moment.id));
    this.presentReplyRequests.set(moment.id, request);
    return request;
  }

  /** Explore is explicit, scoped to the visible session, and never persisted as a user label. */
  public async requestExploration(session: HarborSession, requestedGroup?: ExploreGroup): Promise<ExploreResult | null> {
    this.dispatch({ type: 'SET_REQUEST', request: 'thinking' });
    const result = await this.companion.exploreSession(session, requestedGroup);
    this.dispatch({ type: 'SET_REQUEST', request: 'idle', ...(result ? {} : { error: '暫時找不到可用的新角度。' }) });
    return result;
  }

  /** Enter LAND with a visible draft first; no closure has been persisted yet. */
  public async beginLanding(session: HarborSession) {
    this.dispatch({ type: 'SET_REQUEST', request: 'thinking' });
    const draft: SessionClosureDraft | null = await this.companion.closeSession(session);
    const closure = draft ? this.toClosure(session, draft) : this.fallbackClosure(session);
    this.dispatch({ type: 'LANDING_READY', closure });
  }

  /** A landing becomes durable only when the person chooses to return to now. */
  public async completeLanding(sessionId: string, closure: SessionClosure) {
    const data = await this.storage.getData();
    const current = data.sessions.find(session => session.id === sessionId);
    if (!current) return;
    const session: HarborSession = { ...current, status: 'landed', closure, updatedAt: Date.now() };
    await this.storage.saveSession(session);
    this.dispatch({ type: 'SESSION_UPDATED', session });
    this.reset();
  }

  public returnToChat() { this.dispatch({ type: 'RETURN_TO_CHAT' }); }

  /** Cross-time data is read only after this explicit REVIEW action. */
  public async requestReviewReading(): Promise<ReviewReading | null> {
    this.dispatch({ type: 'SET_REQUEST', request: 'thinking' });
    const reading = await this.memory.readRecentTimeline((await this.storage.getData()).moments);
    this.dispatch({ type: 'SET_REQUEST', request: 'idle', ...(reading ? {} : { error: undefined }) });
    return reading;
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

  public async getMoments(): Promise<Moment[]> {
    return (await this.storage.getData()).moments.sort((a, b) => b.createdAt - a.createdAt);
  }

  public async getSessions(): Promise<HarborSession[]> {
    return (await this.storage.getData()).sessions.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  public async getBackupStatus(): Promise<BackupStatus> { return (await this.storage.getData()).backup; }

  public async getBackupOverview(): Promise<BackupOverview> {
    const data = await this.storage.getData();
    return {
      status: data.backup,
      moments: data.moments.length,
      sessions: data.sessions.length,
      turns: data.sessions.reduce((total, session) => total + session.turns.length, 0),
      closures: data.sessions.filter(session => Boolean(session.closure)).length,
      lines: data.lines.length,
      decisions: data.linkDecisions.length
    };
  }

  /** Re-entering a landed session is explicit; its previous landing stays as context. */
  public async openSession(sessionId: string) {
    const data = await this.storage.getData();
    const current = data.sessions.find(session => session.id === sessionId);
    if (!current) return;
    const origin = data.moments.find(moment => moment.id === current.originMomentId);
    if (!origin) return;
    const session = current.status === 'active' ? current : { ...current, status: 'active' as const, updatedAt: Date.now() };
    if (session !== current) await this.storage.saveSession(session);
    this.dispatch({ type: 'SESSION_OPENED', moment: origin, session });
  }

  public openReview() { this.dispatch({ type: 'SET_SCREEN', screen: 'REVIEW' }); }
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
    await this.storage.mergeImported(incoming);
    this.dispatch({ type: 'SET_REQUEST', request: 'idle' });
  }

  public reset() { this.dispatch({ type: 'RESET_TO_HOME' }); }

  private createOrContinueSession(moment: Moment): HarborSession {
    const active = this.snapshot.currentSession;
    const userTurn = { id: this.id('turn'), role: 'user' as const, content: moment.content, createdAt: moment.createdAt, momentId: moment.id };
    if (moment.intent === 'follow_up' && active?.status === 'active') {
      return { ...active, momentIds: [...new Set([...active.momentIds, moment.id])], turns: [...active.turns, userTurn], updatedAt: moment.createdAt };
    }
    return { id: this.id('session'), originMomentId: moment.id, momentIds: [moment.id], turns: [userTurn], recalledMomentIds: [], status: 'active', createdAt: moment.createdAt, updatedAt: moment.createdAt };
  }

  private toClosure(session: HarborSession, draft: SessionClosureDraft): SessionClosure {
    return {
      ...draft,
      createdAt: Date.now(),
      sourceTurnIds: session.turns.filter(turn => turn.role === 'user').map(turn => turn.id)
    };
  }

  private fallbackClosure(session: HarborSession): SessionClosure {
    const last = [...session.turns].reverse().find(turn => turn.role === 'user');
    const excerpt = last?.content.replace(/\s+/g, ' ').slice(0, 28) || '這次談到的事';
    return {
      takeaway: `「${excerpt}${last && last.content.length > 28 ? '…' : ''}」先留在這裡。`,
      unresolved: '今天還不用把它想完。',
      createdAt: Date.now(),
      sourceTurnIds: session.turns.filter(turn => turn.role === 'user').map(turn => turn.id)
    };
  }

  private appendAssistantTurn(session: HarborSession, momentId: string, content: string): HarborSession {
    const exists = session.turns.some(turn => turn.role === 'assistant' && turn.momentId === momentId && turn.content === content);
    if (exists) return session;
    return { ...session, turns: [...session.turns, { id: this.id('turn'), role: 'assistant', content, createdAt: Date.now(), momentId }], updatedAt: Date.now() };
  }

  private findSessionForMoment(data: MindHarborData, momentId: string): HarborSession | null {
    return data.sessions.find(session => session.momentIds.includes(momentId)) || null;
  }

  private id(prefix: string) {
    return typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }
}
