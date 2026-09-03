import { useCallback, useEffect, useState } from 'react';
import { useFlowEngine } from '../context/FlowContext';
import { FlowState, HarborSession, Moment, MomentIntent } from '../types';

export function useFlow() {
  const engine = useFlowEngine();
  const [snapshot, setSnapshot] = useState(engine.getSnapshot());

  const sync = useCallback(() => {
    setSnapshot(engine.getSnapshot());
  }, [engine]);

  useEffect(() => engine.subscribe(sync), [engine, sync]);

  const submitText = useCallback((text: string, intent?: MomentIntent) => engine.submitText(text, intent), [engine]);
  const requestPresentReply = useCallback((moment: Moment) => engine.requestPresentReply(moment), [engine]);
  const requestSessionClosure = useCallback((session: HarborSession) => engine.requestSessionClosure(session), [engine]);
  const saveImmediateReply = useCallback((momentId: string, reply: string) => engine.saveImmediateReply(momentId, reply), [engine]);
  const getMoments = useCallback(() => engine.getMoments(), [engine]);
  const getSessions = useCallback(() => engine.getSessions(), [engine]);
  const getLines = useCallback(() => engine.getLines(), [engine]);
  const getBackupStatus = useCallback(() => engine.getBackupStatus(), [engine]);
  const requestMemoryReading = useCallback(() => engine.requestMemoryReading(), [engine]);
  const requestTimelineInsight = useCallback((momentIds: string[]) => engine.requestTimelineInsight(momentIds), [engine]);

  return {
    state: snapshot.screen,
    currentMoment: snapshot.currentMoment,
    currentSession: snapshot.currentSession,
    candidate: snapshot.candidate,
    canDiscover: snapshot.canDiscover,
    activeCollection: snapshot.activeCollection,
    ready: snapshot.ready,
    request: snapshot.request,
    error: snapshot.error,
    submitText,
    requestPresentReply,
    requestSessionClosure,
    saveImmediateReply,
    saveClosure: engine.saveClosure.bind(engine),
    recordRecalledMoments: engine.recordRecalledMoments.bind(engine),
    getMoments,
    getSessions,
    getLines,
    getBackupStatus,
    requestMemoryReading,
    requestTimelineInsight,
    openSession: (sessionId: string) => engine.openSession(sessionId),
    openCandidate: () => engine.openCandidate(),
    openDiscovery: () => engine.openDiscovery(),
    openLine: (lineId: string) => engine.openLine(lineId),
    createManualLine: (momentIds: string[]) => engine.createManualLine(momentIds),
    confirmCandidate: () => engine.confirmCandidate(),
    decideCandidate: (decision: 'dismissed' | 'deferred') => engine.decideCandidate(decision),
    closeParallel: () => engine.closeParallel(),
    exportBackup: () => engine.exportBackup(),
    importBackup: (text: string) => engine.importBackup(text),
    openBackup: () => engine.openBackup(),
    finish: () => engine.reset(),
    transition: (next: FlowState) => engine.transition(next)
  };
}
