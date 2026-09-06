import { useCallback, useEffect, useState } from 'react';
import { useFlowEngine } from '../context/FlowContext';
import { ExploreGroup, HarborSession, Moment, MomentIntent, SessionClosure } from '../types';

/** React adapter for the MVI Flow Engine; screens never import data or AI services. */
export function useFlow() {
  const engine = useFlowEngine();
  const [snapshot, setSnapshot] = useState(engine.getSnapshot());
  const sync = useCallback(() => setSnapshot(engine.getSnapshot()), [engine]);
  useEffect(() => engine.subscribe(sync), [engine, sync]);

  return {
    state: snapshot.screen,
    currentMoment: snapshot.currentMoment,
    currentSession: snapshot.currentSession,
    dockedMoment: snapshot.dockedMoment,
    pendingClosure: snapshot.pendingClosure,
    ready: snapshot.ready,
    request: snapshot.request,
    persistenceState: snapshot.persistenceState,
    error: snapshot.error,
    submitText: (text: string, intent?: MomentIntent) => engine.submitText(text, intent),
    openChat: () => engine.openChat(),
    dismissDockedMoment: () => engine.dismissDockedMoment(),
    requestPresentReply: (moment: Moment, session?: HarborSession, force?: boolean) => engine.requestPresentReply(moment, session, force),
    requestExploration: (session: HarborSession, requestedGroupOrExcludeAxes?: ExploreGroup | string[]) => engine.requestExploration(session, requestedGroupOrExcludeAxes),
    saveImmediateReply: (momentId: string, reply: string) => engine.saveImmediateReply(momentId, reply),
    beginLanding: (session: HarborSession) => engine.beginLanding(session),
    completeLanding: (sessionId: string, closure: SessionClosure) => engine.completeLanding(sessionId, closure),
    returnToChat: () => engine.returnToChat(),
    settleItem: (kind: 'moment' | 'session', id: string) => engine.settleItem(kind, id),
    unsettleItem: (kind: 'moment' | 'session', id: string) => engine.unsettleItem(kind, id),
    settleAllStill: () => engine.settleAllStill(),
    deleteItem: (kind: 'moment' | 'session', id: string) => engine.deleteItem(kind, id),
    canShowPatternMirror: () => engine.canShowPatternMirror(),
    requestPatternMirror: () => engine.requestPatternMirror(),
    getTemporalCandidate: () => engine.getTemporalCandidate(),
    resolveTemporalDelta: (momentId: string, choice: 'still' | 'faded' | 'resolved') => engine.resolveTemporalDelta(momentId, choice),
    getContinuityCandidate: () => engine.getContinuityCandidate(),
    resolveContinuityProbe: (momentId: string, state: 'still' | 'faded') => engine.resolveContinuityProbe(momentId, state),
    resumeContinuityMoment: (momentId: string) => engine.resumeContinuityMoment(momentId),
    suppressContinuityProbe: (momentId: string) => engine.suppressContinuityProbe(momentId),
    dismissContinuityProbe: (momentId: string) => engine.dismissContinuityProbe(momentId),
    getMoments: () => engine.getMoments(),
    getSessions: () => engine.getSessions(),
    getBackupStatus: () => engine.getBackupStatus(),
    getBackupOverview: () => engine.getBackupOverview(),
    openSession: (sessionId: string) => engine.openSession(sessionId),
    openReview: () => engine.openReview(),
    openBackup: () => engine.openBackup(),
    exportBackup: () => engine.exportBackup(),
    importBackup: (text: string) => engine.importBackup(text),
    finish: () => engine.reset()
  };
}

