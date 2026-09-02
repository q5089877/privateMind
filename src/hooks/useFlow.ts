import { useCallback, useEffect, useState } from 'react';
import { useFlowEngine } from '../context/FlowContext';
import { FlowState, MomentIntent } from '../types';

export function useFlow() {
  const engine = useFlowEngine();
  const [state, setState] = useState<FlowState>(engine.getState());
  const [currentMoment, setCurrentMoment] = useState(engine.getCurrentMoment());
  const [candidate, setCandidate] = useState(engine.getCandidate());
  const [canDiscover, setCanDiscover] = useState(engine.canOpenDiscovery());
  const [activeCollection, setActiveCollection] = useState(engine.getActiveCollection());
  const [ready, setReady] = useState(engine.isReady());

  const sync = useCallback(() => {
    setState(engine.getState());
    setCurrentMoment(engine.getCurrentMoment());
    setCandidate(engine.getCandidate());
    setCanDiscover(engine.canOpenDiscovery());
    setActiveCollection(engine.getActiveCollection());
    setReady(engine.isReady());
  }, [engine]);

  useEffect(() => engine.subscribe(sync), [engine, sync]);

  return {
    state,
    currentMoment,
    candidate,
    canDiscover,
    activeCollection,
    ready,
    submitText: (text: string, intent?: MomentIntent) => engine.submitText(text, intent),
    saveImmediateReply: (momentId: string, reply: string) => engine.saveImmediateReply(momentId, reply),
    getMoments: () => engine.getMoments(),
    getLines: () => engine.getLines(),
    getBackupStatus: () => engine.getBackupStatus(),
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
