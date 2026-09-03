import { HarborIntent } from './harborIntent';
import { HarborAppState } from './harborState';

/** Pure reducer: no database, browser, or AI calls belong here. */
export const harborReducer = (state: HarborAppState, intent: HarborIntent): HarborAppState => {
  switch (intent.type) {
    case 'HYDRATED':
      return { ...state, ready: true, request: 'idle', candidate: intent.candidate, canDiscover: intent.canDiscover };
    case 'SET_SCREEN':
      return { ...state, screen: intent.screen };
    case 'SET_REQUEST':
      return { ...state, request: intent.request, error: intent.error };
    case 'MOMENT_CAPTURED':
      // No historical pattern is surfaced at the moment someone has just written.
      return { ...state, screen: 'PRESENT_SETTLED', request: 'idle', currentMoment: intent.moment, currentSession: intent.session, activeCollection: null, candidate: null, canDiscover: intent.canDiscover };
    case 'MOMENT_REPLY_SAVED':
      return { ...state, request: 'idle', currentMoment: intent.moment || state.currentMoment, currentSession: intent.session || state.currentSession };
    case 'SESSION_OPENED':
      return { ...state, screen: 'PRESENT_SETTLED', request: 'idle', currentMoment: intent.moment, currentSession: intent.session, activeCollection: null };
    case 'SESSION_UPDATED':
      return { ...state, request: 'idle', currentSession: intent.session || state.currentSession };
    case 'COLLECTION_OPENED':
      return { ...state, screen: 'PARALLEL', activeCollection: intent.collection };
    case 'COLLECTION_CLOSED':
      return { ...state, screen: 'REVIEW', activeCollection: null };
    case 'CANDIDATE_UPDATED':
      return { ...state, candidate: intent.candidate, canDiscover: intent.canDiscover ?? state.canDiscover };
    case 'RESET_TO_HOME':
      return { ...state, screen: 'HOME', currentMoment: null, currentSession: null, activeCollection: null, request: 'idle' };
    default:
      return state;
  }
};
