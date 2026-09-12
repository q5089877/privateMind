import { useCallback, useEffect, useState } from 'react';
import { useFlowEngine } from '../context/FlowContext';
import { HarborSession, Moment, MomentIntent, PresentPayload, SessionClosure } from '../types';

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
    presentAcknowledgedMomentId: snapshot.presentAcknowledgedMomentId,
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
    requestExploration: (session: HarborSession, excludeAxes?: string[]) => engine.requestExploration(session, excludeAxes),
    saveImmediateReply: (momentId: string, reply: string, presentReply?: PresentPayload) => engine.saveImmediateReply(momentId, reply, presentReply),
    beginLanding: (session: HarborSession) => engine.beginLanding(session),
    beginLandingFromMoment: (momentId: string) => engine.beginLandingFromMoment(momentId),
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
    getMoments: () => engine.getMoments(),
    getSessions: () => engine.getSessions(),
    getTodayAnchorStats: () => engine.getTodayAnchorStats(),
    recordAnchorEvent: (type: 'tap' | 'hold', durationMs?: number) => engine.recordAnchorEvent(type, durationMs),
    confirmEventLayer: (text: string) => engine.confirmEventLayer(text),
    getIcebergLayers: (sessionId: string) => engine.getIcebergLayers(sessionId),
    anchorLayer: (layer: 'event' | 'feeling' | 'meaning' | 'expectation' | 'yearning') => engine.anchorLayer(layer),
    getSessionAnchorState: (sessionId: string) => engine.getSessionAnchorState(sessionId),
    recordFeelingLayer: (text: string) => engine.recordFeelingLayer(text),
    appendFeelingLayer: (text: string) => engine.appendFeelingLayer(text),
    recordMeaningLayer: (text: string) => engine.recordMeaningLayer(text),
    recordOptionalLayer: (layer: 'expectation' | 'yearning', text: string) => engine.recordOptionalLayer(layer, text),
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

