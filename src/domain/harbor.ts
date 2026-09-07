export type FlowState = 'HOME' | 'CHAT' | 'LAND' | 'REVIEW' | 'BACKUP';

export type PersistenceState = 'accepted' | 'persisted' | 'volatile' | 'failed';

/** Why a moment was written. It is inferred from its entry point, never requested as a field. */
export type MomentIntent = 'captured' | 'reappeared' | 'follow_up' | 'context_added';
export type MomentLifecycle = 'docked' | 'sealed';

/**
 * Continuity probe outcome — only what we actually know.
 * still  = user says it is still present this moment (stops further probing this round)
 * faded  = user says it has faded this moment (ends this Continuity round; new round possible if user writes about it again)
 */
export type TemporalStatus = 'pending' | 'still' | 'faded' | 'resolved';

export interface TemporalValidation {
  status: TemporalStatus;
  validatedAt?: number;
  nextEligibleAt?: number; // 針對 'still'，設定為 Date.now() + 7 * 86400000
}

export interface TemporalGlobalState {
  consecutiveStillCount: number;
  silencedUntil?: number;       // 連續 2 次 still 觸發 5 天冷卻
  lastEvaluatedAt?: number;     // 任意操作觸發 12 小時全域冷卻
}

/** The indivisible, user-authored unit. It is never rewritten by AI. */
export interface Moment {
  id: string;
  content: string;
  createdAt: number;
  intent: MomentIntent;
  /** Lifecycle is persisted for new records; legacy records default to docked during normalisation. */
  lifecycle?: MomentLifecycle;
  immediateReply?: string;
  /** Set when the user settles a moment: hidden from Review feed, still in Pattern pool. */
  settledAt?: number;
  /** Set when the user hard-deletes: hidden everywhere. Backup still exports it. */
  deletedAt?: number;
  /**
   * 48-Hour Temporal Delta Validation.
   * Tracks user-reported status after time decay.
   */
  temporalValidation?: TemporalValidation;
  /**
   * Continuity probe response: still | faded | null (legacy, superseded by temporalValidation).
   */
  /**
   * true = user chose "先不提這個" — do not proactively surface this Moment again.
   * Semantics: "please don't ask me about this one" — NOT "the user is avoiding it".
   * Reason could be anything: busy, tired, irrelevant. No inference allowed.
   */
  /** Timestamp when the continuity probe was first shown to user. null = never shown. */
}

export type ConversationRole = 'user' | 'assistant';

/** One spoken turn inside a temporary harbor conversation. */
export interface ConversationTurn {
  id: string;
  role: ConversationRole;
  content: string;
  createdAt: number;
  momentId?: string;
}

/** A temporary landing, never a diagnosis or permanent verdict. */
export interface SessionClosure {
  takeaway: string;
  unresolved: string;
  resumeAnchor?: string;
  createdAt: number;
  sourceTurnIds: string[];
}

/** A closure before the person chooses to keep it with the session. */
export interface SessionClosureDraft {
  takeaway: string;
  unresolved: string;
  resumeAnchor?: string;
}

/** A non-persistent session-only exploration group. It is never a user label. */
export type ExplorePerspectiveId =
  | 'fact' | 'time' | 'control' | 'defusion'
  | 'need' | 'body' | 'context' | 'exception'
  | 'other' | 'scale' | 'assumption' | 'action'
  | 'change' | 'suspend' | 'values' | 'constraint' | 'reversible'
  | 'self' | 'unknown' | 'observer' | 'system';

/** One distinct, user-invoked AI angle grounded in this session's own user turns. */
export interface ExplorePerspective {
  id: ExplorePerspectiveId;
  title: string;
  content: string;
  followUp: string;
  sourcePhrases: string[];
}

/** An ephemeral result. It must never be persisted as a Moment, turn, or user category. */
export interface ExploreResult {
  perspectives: ExplorePerspective[];
}

export interface TimelineEvidence {
  date: string;
  phrase: string;
}

/** A cited observation, only available after the person explicitly opens a review. */
export interface TimelineInsight {
  evidence: TimelineEvidence[];
  angle: string;
  unresolved: string;
}

/** @deprecated Legacy. Use PatternMirror instead. Kept only for backup import compatibility. */
export interface ReviewReading extends TimelineInsight {
  momentIds: string[];
}

/**
 * The result of Pattern Passive Mirroring.
 * Contains only original user-authored text — zero AI-generated copy.
 */
export interface PatternMirror {
  /** 3–4 original Moments selected by literal-anchor overlap. */
  moments: Pick<Moment, 'id' | 'content' | 'createdAt'>[];
}

export type HarborSessionStatus = 'active' | 'landed';

/** The conversation that grows from one Moment and may continue across several turns. */
export interface HarborSession {
  id: string;
  originMomentId: string;
  momentIds: string[];
  turns: ConversationTurn[];
  recalledMomentIds: string[];
  status: HarborSessionStatus;
  createdAt: number;
  updatedAt: number;
  closure?: SessionClosure;
  /** Set when the user settles a session: hidden from Review feed, still in Pattern pool. */
  settledAt?: number;
  /** Set when the user hard-deletes: hidden everywhere. Backup still exports it. */
  deletedAt?: number;
}

/** Legacy relationship shapes remain for import compatibility only. */
export type LinkDecisionKind = 'confirmed' | 'dismissed' | 'deferred';

/** A user-owned relationship between moments. It never changes their original timeline. */
export interface ThreadLine {
  id: string;
  momentIds: string[];
  createdAt: number;
  updatedAt: number;
  origin: 'confirmed_suggestion' | 'manual';
}

export interface LinkDecision {
  fingerprint: string;
  decision: LinkDecisionKind;
  decidedAt: number;
}

export type AnchorEventType = 'tap' | 'hold';

/** A factual, local-only record of the physical anchor interaction. */
export interface AnchorEvent {
  id: string;
  type: AnchorEventType;
  occurredAt: number;
  durationMs?: number;
}

export interface DailyAnchorStats {
  tapCount: number;
  holdCount: number;
}
export interface BackupStatus {
  lastExportedAt?: number;
  lastImportedAt?: number;
  pendingChanges: number;
}

/** A transparent inventory of every local-first record included in a JSON backup. */
export interface BackupOverview {
  status: BackupStatus;
  moments: number;
  sessions: number;
  turns: number;
  closures: number;
  lines: number;
  decisions: number;
  anchorEvents: number;
}

/** The complete local-first backup payload. */
export interface MindHarborData {
  version: 2;
  moments: Moment[];
  sessions: HarborSession[];
  lines: ThreadLine[];
  linkDecisions: LinkDecision[];
  anchorEvents: AnchorEvent[];
  temporalState?: TemporalGlobalState;
  backup: BackupStatus;
}

/** Legacy shapes remain only for a safe localStorage migration. */
export interface DialogueEntry {
  id: string;
  threadId: string;
  content: string;
  createdAt: number;
  intent?: MomentIntent;
  aiResponse?: string;
  relatedEntryIds?: string[];
  dismissedRelatedEntryIds?: string[];
}

export interface ThoughtThread {
  id: string;
  createdAt: number;
  updatedAt: number;
  isArchived?: boolean;
  entries: DialogueEntry[];
}
