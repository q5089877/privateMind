import { ActiveCollection, HarborSession, LinkCandidate, Moment, MomentIntent, SessionClosure } from '../domain/harbor';

/** Public, user-originated intentions. New UI should call the flow engine with these. */
export type HarborUserIntent =
  | { type: 'CAPTURE_MOMENT'; content: string; intent?: MomentIntent }
  | { type: 'REQUEST_PRESENT_REPLY'; moment: Moment }
  | { type: 'REQUEST_SESSION_CLOSURE'; session: HarborSession }
  | { type: 'SAVE_PRESENT_REPLY'; momentId: string; reply: string }
  | { type: 'SAVE_CLOSURE'; sessionId: string; closure: SessionClosure }
  | { type: 'OPEN_DISCOVERY' }
  | { type: 'OPEN_BACKUP' }
  | { type: 'RETURN_HOME' };

/**
 * Every state change is named. UI emits user intentions; effects later dispatch
 * their completed events. This keeps async AI and backup work out of components.
 */
export type HarborIntent =
  | { type: 'HYDRATED'; candidate: LinkCandidate | null; canDiscover: boolean }
  | { type: 'SET_SCREEN'; screen: 'HOME' | 'PRESENT_SETTLED' | 'REVIEW' | 'PARALLEL' | 'DISCOVERY' | 'BACKUP' }
  | { type: 'SET_REQUEST'; request: 'idle' | 'saving' | 'thinking' | 'restoring'; error?: string }
  | { type: 'MOMENT_CAPTURED'; moment: Moment; session: HarborSession; canDiscover: boolean }
  | { type: 'MOMENT_REPLY_SAVED'; moment: Moment | null; session: HarborSession | null }
  | { type: 'SESSION_UPDATED'; session: HarborSession | null }
  | { type: 'COLLECTION_OPENED'; collection: ActiveCollection }
  | { type: 'COLLECTION_CLOSED' }
  | { type: 'CANDIDATE_UPDATED'; candidate: LinkCandidate | null; canDiscover?: boolean }
  | { type: 'RESET_TO_HOME' };
