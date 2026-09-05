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
    pendingClosure: snapshot.pendingClosure,
    ready: snapshot.ready,
    request: snapshot.request,
    error: snapshot.error,
    submitText: (text: string, intent?: MomentIntent) => engine.submitText(text, intent),
    requestPresentReply: (moment: Moment, session?: HarborSession) => engine.requestPresentReply(moment, session),
    requestExploration: (session: HarborSession, requestedGroup?: ExploreGroup) => engine.requestExploration(session, requestedGroup),
    saveImmediateReply: (momentId: string, reply: string) => engine.saveImmediateReply(momentId, reply),
    beginLanding: (session: HarborSession) => engine.beginLanding(session),
    completeLanding: (sessionId: string, closure: SessionClosure) => engine.completeLanding(sessionId, closure),
    returnToChat: () => engine.returnToChat(),
    requestReviewReading: () => engine.requestReviewReading(),
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
