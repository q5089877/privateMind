import { HarborSession, Moment, MomentIntent, SessionClosure } from '../domain/harbor';

/** Public, user-originated intentions. New UI should call the flow engine with these. */
export type HarborUserIntent =
  | { type: 'CAPTURE_MOMENT'; content: string; intent?: MomentIntent }
  | { type: 'REQUEST_PRESENT_REPLY'; moment: Moment }
  | { type: 'SAVE_PRESENT_REPLY'; momentId: string; reply: string }
  | { type: 'BEGIN_LANDING'; session: HarborSession }
  | { type: 'SAVE_LANDING'; sessionId: string; closure: SessionClosure }
  | { type: 'OPEN_BACKUP' }
  | { type: 'RETURN_HOME' };

/**
 * Every state change is named. UI emits user intentions; effects later dispatch
 * their completed events. This keeps async AI and backup work out of components.
 */
export type HarborIntent =
  | { type: 'HYDRATED' }
  | { type: 'SET_SCREEN'; screen: 'HOME' | 'CHAT' | 'LAND' | 'REVIEW' | 'BACKUP' }
  | { type: 'SET_REQUEST'; request: 'idle' | 'saving' | 'thinking' | 'restoring'; error?: string }
  | { type: 'MOMENT_CAPTURED'; moment: Moment; session: HarborSession }
  | { type: 'MOMENT_REPLY_SAVED'; moment: Moment | null; session: HarborSession | null }
  | { type: 'SESSION_OPENED'; moment: Moment; session: HarborSession }
  | { type: 'SESSION_UPDATED'; session: HarborSession | null }
  | { type: 'LANDING_READY'; closure: SessionClosure }
  | { type: 'RETURN_TO_CHAT' }
  | { type: 'RESET_TO_HOME' };
