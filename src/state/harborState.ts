import { ActiveCollection, HarborSession, LinkCandidate, Moment } from '../domain/harbor';

export type HarborRequestState = 'idle' | 'saving' | 'thinking' | 'restoring';

/** The single observable application snapshot used by React. */
export interface HarborAppState {
  screen: 'HOME' | 'PRESENT_SETTLED' | 'REVIEW' | 'PARALLEL' | 'DISCOVERY' | 'BACKUP';
  currentMoment: Moment | null;
  currentSession: HarborSession | null;
  activeCollection: ActiveCollection | null;
  candidate: LinkCandidate | null;
  canDiscover: boolean;
  ready: boolean;
  request: HarborRequestState;
  error?: string;
}

export const initialHarborState: HarborAppState = {
  screen: 'HOME',
  currentMoment: null,
  currentSession: null,
  activeCollection: null,
  candidate: null,
  canDiscover: false,
  ready: false,
  request: 'restoring'
};
