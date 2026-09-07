import { MindHarborRepository } from '../data/MindHarborRepository';
import { AnchorEventType, BackupOverview, BackupStatus, DailyAnchorStats, ExploreResult, HarborSession, MindHarborData, Moment, MomentIntent, PatternMirror, ReviewReading, SessionClosure, SessionClosureDraft } from '../domain/harbor';
import { BackupService } from '../services/backup/BackupService';
import { CompanionService } from '../services/ai/CompanionService';
import { PatternService } from '../services/memory/PatternService';
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
  private readonly pattern = new PatternService();
  private readonly companion = new CompanionService();
  private readonly backup = new BackupService();
  private listeners: Array<() => void> = [];
  private readonly presentReplyRequests = new Map<string, Promise<string | null>>();
  private activePresentAbortController: AbortController | null = null;

  constructor() {
    void this.initialise();
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        // 使用者鎖屏或切換頁面時，立即中斷正在執行的背景推論，省下無效回呼與記憶體
        if (document.visibilityState === 'hidden') {
          this.cancelActivePresentRequest();
        }
      });
    }
  }

  public cancelActivePresentRequest() {
    if (this.activePresentAbortController) {
      this.activePresentAbortController.abort();
      this.activePresentAbortController = null;
    }
  }

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
      case 'RESET_HARBOR': return this.reset();
      default: return null;
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

  /** Save the raw Moment first. Follow-up turns persist a Session only after explicit CHAT input. */
  public async submitText(content: string, intent: MomentIntent = 'captured') {
    const clean = content.trim();
    if (!clean) return;
    this.dispatch({ type: 'SET_REQUEST', request: 'saving' });
    const moment: Moment = { id: this.id('moment'), content: clean, createdAt: Date.now(), intent, lifecycle: 'docked' };

    if (intent === 'follow_up' && this.snapshot.currentSession) {
      const session = this.createOrContinueSession(moment);
      await this.storage.saveMomentWithSession(moment, session);
      this.dispatch({ type: 'SESSION_CONTINUED', moment, session });

      // Local persistence is already complete; AI is an optional second step.
      const reply = await this.requestPresentReply(moment, session);
      if (reply) await this.saveImmediateReply(moment.id, reply);
      return;
    }

    await this.storage.saveMoment(moment);
    const persistenceState = this.storage.getPersistenceStatus();
    this.dispatch({ type: 'MOMENT_DOCKED', moment, persistenceState });
  }

  /** User chose to discuss the latest Moment. The Session is memory-only until a follow-up is sent. */
  /** User chose "接著說" on the docked card. Moves to CHAT. */
  public openChat() {
    const moment = this.snapshot.dockedMoment || this.snapshot.currentMoment;
    if (!moment) return;
    const session = this.createOrContinueSession(moment);
    this.dispatch({ type: 'OPEN_CHAT', moment, session });
  }

  /** Explicitly dismiss the docked card. */
  public dismissDockedMoment() {
    this.dispatch({ type: 'DISMISS_DOCKED_MOMENT' });
  }

  /** Present Companion reads one current Moment with in-session context, and no past cross-session history. */
  public async requestPresentReply(moment: Moment, session?: HarborSession, force = false): Promise<string | null> {
    if (force) {
      this.presentReplyRequests.delete(moment.id);
    }
    const existing = this.presentReplyRequests.get(moment.id);
    if (existing) return existing;

    // 連擊 (Burst) 熔斷防禦：若有前一個推論正在跑，立即 abort 掉，不賽跑、不浪費 Token
    this.cancelActivePresentRequest();
    const abortController = new AbortController();
    this.activePresentAbortController = abortController;

    const activeSession = session || this.snapshot.currentSession || undefined;
    this.dispatch({ type: 'SET_REQUEST', request: 'thinking' });
    const request = this.companion.replyToPresentMoment(moment, activeSession, abortController.signal).then(reply => {
      this.dispatch(reply
        ? { type: 'SET_REQUEST', request: 'idle' }
        : { type: 'SET_REQUEST', request: 'idle', error: '回應暫時沒有連上。' });
      return reply;
    }).catch(() => null).finally(() => {
      if (this.activePresentAbortController === abortController) {
        this.activePresentAbortController = null;
      }
      this.presentReplyRequests.delete(moment.id);
    });
    this.presentReplyRequests.set(moment.id, request);
    return request;
  }

  /** Explore is explicit, scoped to the visible session, and never persisted as a user label. */
  public async requestExploration(session: HarborSession, excludeAxes?: string[]): Promise<ExploreResult | null> {
    this.dispatch({ type: 'SET_REQUEST', request: 'thinking' });
    const result = await this.companion.exploreSession(session, excludeAxes);
    this.dispatch({ type: 'SET_REQUEST', request: 'idle', ...(result ? {} : { error: '暫時找不到可用的新角度。' }) });
    return result;
  }

  /** Enter LAND with a visible draft first; no closure has been persisted yet. */
  public async beginLanding(session: HarborSession) {
    const moment = this.snapshot.currentMoment || (await this.getMoments()).find(item => item.id === session.originMomentId) || null;
    if (!moment) return;
    this.dispatch({ type: 'SET_REQUEST', request: 'thinking' });
    const draft: SessionClosureDraft | null = await this.companion.closeSession(session);
    const closure = draft ? this.toClosure(session, draft) : this.fallbackClosure(session);
    this.dispatch({ type: 'LANDING_READY', closure, moment, session });
  }

  /** Start a non-persistent LAND draft directly from a docked Moment. */
  public async beginLandingFromMoment(momentId: string) {
    const moment = this.snapshot.dockedMoment || this.snapshot.currentMoment;
    if (!moment || moment.id !== momentId) return;
    await this.beginLanding(this.createOrContinueSession(moment));
  }

  /** LAND is durable only after explicit confirmation. */
  public async completeLanding(sessionId: string, closure: SessionClosure) {
    const data = await this.storage.getData();
    const persisted = data.sessions.find(session => session.id === sessionId);
    const draft = persisted || (this.snapshot.currentSession?.id === sessionId ? this.snapshot.currentSession : null);
    if (!draft) return;
    const momentId = draft.originMomentId;
    const committed = await this.storage.commitClosure(momentId, draft, closure);
    const savedSession = committed.sessions.find(session => session.id === sessionId) || null;
    this.dispatch({ type: 'SESSION_UPDATED', session: savedSession });
    this.reset();
  }

  public returnToChat() { this.dispatch({ type: 'RETURN_TO_CHAT' }); }

  /** Pattern Passive Mirroring: deterministic gate first, then literal-anchor AI selection. */
  public async requestPatternMirror(): Promise<PatternMirror | null> {
    this.dispatch({ type: 'SET_REQUEST', request: 'thinking' });
    const mirror = await this.pattern.findMirror((await this.storage.getData()).moments);
    this.dispatch({ type: 'SET_REQUEST', request: 'idle' });
    return mirror;
  }

  /** Eligibility check (no AI call). Use to gate the faint mirror hint in ReviewScreen. */
  public async canShowPatternMirror(): Promise<boolean> {
    return this.pattern.canMirror((await this.storage.getData()).moments);
  }

  public async saveImmediateReply(momentId: string, reply: string) {
    const clean = reply.trim();
    if (!clean) return;
    const data = await this.storage.getData();
    const storedMoment = data.moments.find(moment => moment.id === momentId) || null;
    const storedSession = this.findSessionForMoment(data, momentId);
    if (!storedMoment) return;
    // The first CHAT session is initially a memory-only draft. Persist the reply
    // into that draft too, so the visible reply and Session.turns cannot diverge.
    const draftSession = storedSession || (this.snapshot.currentSession?.momentIds.includes(momentId) ? this.snapshot.currentSession : null);
    const session = draftSession ? this.appendAssistantTurn(draftSession, momentId, clean) : null;
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

  /** Settle: hide from Review feed, keep in Pattern pool. Reversible. */
  public async settleItem(kind: 'moment' | 'session', id: string): Promise<void> {
    await this.storage.settleItem(kind, id);
  }

  public async unsettleItem(kind: 'moment' | 'session', id: string): Promise<void> {
    await this.storage.unsettleItem(kind, id);
  }

  public async settleAllStill(): Promise<void> {
    await this.storage.settleAllStill();
  }

  /**
   * Hard delete. If the item is part of the current Pattern Mirror result,
   * callers should warn the user first. Engine does not gate — UI gates.
   */
  public async deleteItem(kind: 'moment' | 'session', id: string): Promise<void> {
    await this.storage.deleteItem(kind, id);
  }

  /**
   * 48-Hour Temporal Delta: Selects the most recent unvalidated Moment >= 48h old.
   */
  public async getTemporalCandidate(): Promise<Moment | null> {
    return this.storage.getTemporalCandidate();
  }

  /**
   * Resolves Temporal Delta validation state with zero AI tokens.
   */
  public async resolveTemporalDelta(momentId: string, choice: 'still' | 'faded' | 'resolved'): Promise<void> {
    await this.storage.resolveTemporalDelta(momentId, choice);
  }

  public async getTodayAnchorStats(): Promise<DailyAnchorStats> {
    return this.storage.getTodayAnchorStats();
  }

  public async recordAnchorEvent(type: AnchorEventType, durationMs?: number): Promise<DailyAnchorStats> {
    return this.storage.recordAnchorEvent(type, durationMs);
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
      decisions: data.linkDecisions.length,
      anchorEvents: data.anchorEvents.length
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
    try {
      const incoming = this.backup.parse(text);
      await this.storage.mergeImported(incoming);
      this.dispatch({ type: 'SET_REQUEST', request: 'idle' });
    } catch (error) {
      this.dispatch({ type: 'SET_REQUEST', request: 'idle', error: error instanceof Error ? error.message : '備份匯入失敗。' });
    }
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
      unresolved: '目前沒有新的可驗證資訊。',
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
