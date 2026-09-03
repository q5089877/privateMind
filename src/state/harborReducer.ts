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
    case 'MOMENT_CAPTURED':
      return { ...state, screen: 'CHAT', request: 'idle', currentMoment: intent.moment, currentSession: intent.session, pendingClosure: null };
    case 'MOMENT_REPLY_SAVED':
      return { ...state, request: 'idle', currentMoment: intent.moment || state.currentMoment, currentSession: intent.session || state.currentSession };
    case 'SESSION_OPENED':
      return { ...state, screen: 'CHAT', request: 'idle', currentMoment: intent.moment, currentSession: intent.session, pendingClosure: null };
    case 'SESSION_UPDATED':
      return { ...state, request: 'idle', currentSession: intent.session || state.currentSession };
    case 'LANDING_READY':
      return { ...state, screen: 'LAND', request: 'idle', pendingClosure: intent.closure };
    case 'RETURN_TO_CHAT':
      return { ...state, screen: 'CHAT', request: 'idle', pendingClosure: null };
    case 'RESET_TO_HOME':
      return { ...state, screen: 'HOME', currentMoment: null, currentSession: null, pendingClosure: null, request: 'idle' };
    default:
      return state;
  }
};
