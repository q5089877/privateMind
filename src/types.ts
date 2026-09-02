export type FlowState = 'HOME' | 'PRESENT_SETTLED' | 'REVIEW' | 'PARALLEL' | 'BACKUP';

/** Why a moment was written. It is inferred from the entry point, never requested as a field. */
export type MomentIntent = 'captured' | 'reappeared' | 'follow_up' | 'context_added';

/**
 * The indivisible unit of Mind Harbor.
 * A moment has one place in time; links may later point to it without moving it.
 */
export interface Moment {
  id: string;
  content: string;
  createdAt: number;
  intent: MomentIntent;
  immediateReply?: string;
}

export type LinkDecisionKind = 'confirmed' | 'dismissed' | 'deferred';

/** A quiet, local-only suggestion. It is never shown during the capture that created it. */
export interface LinkCandidate {
  id: string;
  momentIds: string[];
  score: number;
  createdAt: number;
}

/** A user-owned relationship between moments. It never changes the original timeline. */
export interface ThreadLine {
  id: string;
  momentIds: string[];
  createdAt: number;
  updatedAt: number;
  origin: 'confirmed_suggestion' | 'manual';
}

/** Remembering a boundary is as important as remembering a confirmed link. */
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

export interface MindHarborData {
  version: 1;
  moments: Moment[];
  lines: ThreadLine[];
  linkDecisions: LinkDecision[];
  backup: BackupStatus;
}

export interface ActiveCollection {
  kind: 'candidate' | 'line';
  id: string;
  momentIds: string[];
}

/** Legacy shapes are retained only so existing localStorage can be safely migrated. */
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
