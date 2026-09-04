export type FlowState = 'HOME' | 'CHAT' | 'LAND' | 'REVIEW' | 'BACKUP';

/** Why a moment was written. It is inferred from its entry point, never requested as a field. */
export type MomentIntent = 'captured' | 'reappeared' | 'follow_up' | 'context_added';

/** The indivisible, user-authored unit. It is never rewritten by AI. */
export interface Moment {
  id: string;
  content: string;
  createdAt: number;
  intent: MomentIntent;
  immediateReply?: string;
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

/** One distinct, user-invoked AI angle grounded in this session's own user turns. */
export interface ExplorePerspective {
  id: 'focus' | 'contrast' | 'reframe' | 'open';
  title: string;
  content: string;
  followUp: string;
  sourcePhrases: string[];
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

/** A non-persistent result from one explicit review request. */
export interface ReviewReading extends TimelineInsight {
  momentIds: string[];
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
}

/** The complete local-first backup payload. */
export interface MindHarborData {
  version: 2;
  moments: Moment[];
  sessions: HarborSession[];
  lines: ThreadLine[];
  linkDecisions: LinkDecision[];
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
