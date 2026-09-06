import { HarborSession, Moment, SessionClosure } from '../domain/harbor';

export type HarborRequestState = 'idle' | 'saving' | 'thinking' | 'restoring';

/** The single observable application snapshot used by React. */
export interface HarborAppState {
  screen: 'HOME' | 'CHAT' | 'LAND' | 'REVIEW' | 'BACKUP';
  currentMoment: Moment | null;
  currentSession: HarborSession | null;
  /**
   * Transient UI state: the Moment just saved via submitText().
   * Present = show "✓ 停好了" confirmation card on HOME.
   * Cleared on: auto-dismiss timer, OPEN_CHAT, RESET_TO_HOME.
   */
  dockedMoment: Moment | null;
  pendingClosure: SessionClosure | null;
  ready: boolean;
  request: HarborRequestState;
  error?: string;
}

export const initialHarborState: HarborAppState = {
  screen: 'HOME',
  currentMoment: null,
  currentSession: null,
  dockedMoment: null,
  pendingClosure: null,
  ready: false,
  request: 'restoring'
};
