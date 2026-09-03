import { HarborSession, Moment, SessionClosure } from '../domain/harbor';

export type HarborRequestState = 'idle' | 'saving' | 'thinking' | 'restoring';

/** The single observable application snapshot used by React. */
export interface HarborAppState {
  screen: 'HOME' | 'CHAT' | 'LAND' | 'REVIEW' | 'BACKUP';
  currentMoment: Moment | null;
  currentSession: HarborSession | null;
  pendingClosure: SessionClosure | null;
  ready: boolean;
  request: HarborRequestState;
  error?: string;
}

export const initialHarborState: HarborAppState = {
  screen: 'HOME',
  currentMoment: null,
  currentSession: null,
  pendingClosure: null,
  ready: false,
  request: 'restoring'
};
