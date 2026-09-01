import { useState, useCallback, useEffect } from 'react';
import { useFlowEngine } from '../context/FlowContext';
import { FlowState, ThoughtThread, MomentIntent } from '../types';

export function useFlow() {
  const engine = useFlowEngine();
  const [state, setState] = useState<FlowState>(engine.getState());
  const [currentThread, setCurrentThread] = useState<ThoughtThread | null>(engine.getCurrentThread());
  const sync = useCallback(() => { setState(engine.getState()); setCurrentThread(engine.getCurrentThread()); }, [engine]);
  useEffect(() => engine.subscribe(sync), [engine, sync]);
  return {
    state, currentThread,
    submitText: (text: string) => engine.submitText(text), submitSayNothing: () => engine.submitSayNothing(),
    appendEntry: (id: string, text: string, intent?: MomentIntent) => engine.appendEntry(id, text, intent),
    attachCurrentMoment: (id: string) => engine.attachCurrentMoment(id),
    saveReflection: (threadId: string, entryId: string, response: string, relatedIds: string[]) => engine.saveReflection(threadId, entryId, response, relatedIds),
    dismissRelatedMemory: (threadId: string, entryId: string, sourceId: string) => engine.dismissRelatedMemory(threadId, entryId, sourceId),
    finish: () => engine.reset(), transition: (next: FlowState) => engine.transition(next),
    getAllThreads: () => engine.getAllThreads()
  };
}
