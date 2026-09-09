import { HarborIntent } from './harborIntent';
import { HarborAppState } from './harborState';

/** Pure reducer: no database, browser, or AI calls belong here. */
export const harborReducer = (state: HarborAppState, intent: HarborIntent): HarborAppState => {
  switch (intent.type) {
    case 'HYDRATED':
      return { ...state, ready: true, request: 'idle' };
    case 'SET_SCREEN':
      return { ...state, screen: intent.screen };
    case 'SET_REQUEST':
      return { ...state, request: intent.request, error: intent.error };
    case 'SET_PERSISTENCE_STATE':
      return { ...state, persistenceState: intent.state };
    case 'MOMENT_DOCKED':
      // Moment saved. Stay on HOME; show transient card with honest persistence status.
      return { ...state, screen: 'HOME', request: 'idle', dockedMoment: intent.moment, currentMoment: intent.moment, currentSession: intent.session || null, pendingClosure: null, persistenceState: intent.persistenceState || 'persisted' };
    case 'DISMISS_DOCKED_MOMENT':
      // Auto-dismiss or user ignored. Clear card, stay HOME.
      return { ...state, dockedMoment: null };
    case 'OPEN_CHAT':
      // The Session begins in memory and is persisted with its first Present
      // reply or the first explicit continuation, whichever completes first.
      return { ...state, screen: 'CHAT', request: 'idle', currentMoment: intent.moment, currentSession: intent.session, presentAcknowledgedMomentId: null, dockedMoment: null, pendingClosure: null };
    case 'PRESENT_ACKNOWLEDGED':
      return { ...state, request: 'idle', presentAcknowledgedMomentId: intent.momentId };
    case 'MOMENT_REPLY_SAVED':
      return { ...state, request: 'idle', currentMoment: intent.moment || state.currentMoment, currentSession: intent.session || state.currentSession, presentAcknowledgedMomentId: null };
    case 'SESSION_OPENED':
      return { ...state, screen: 'CHAT', request: 'idle', currentMoment: intent.moment, currentSession: intent.session || null, presentAcknowledgedMomentId: null, pendingClosure: null };
    case 'SESSION_UPDATED':
      return { ...state, request: 'idle', currentSession: intent.session || state.currentSession };
    case 'SESSION_CONTINUED':
      return { ...state, screen: 'CHAT', request: 'idle', currentMoment: intent.moment, currentSession: intent.session, presentAcknowledgedMomentId: null, dockedMoment: null };
    case 'LANDING_READY':
      return { ...state, screen: 'LAND', request: 'idle', currentMoment: intent.moment, currentSession: intent.session, dockedMoment: null, pendingClosure: intent.closure };
    case 'RETURN_TO_CHAT':
      return { ...state, screen: 'CHAT', request: 'idle', pendingClosure: null };
    case 'RESET_TO_HOME':
      return { ...state, screen: 'HOME', currentMoment: null, currentSession: null, presentAcknowledgedMomentId: null, dockedMoment: null, pendingClosure: null, request: 'idle' };
    default:
      return state;
  }
};
