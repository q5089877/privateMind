import { useState, useCallback, useEffect } from 'react';
import { useFlowEngine } from '../context/FlowContext';
import { FlowState, ThoughtThread } from '../types';

/**
 * SRP: 此 Hook 負責 React 狀態與 FlowEngine 實例的同步
 */
export function useFlow() {
  const engine = useFlowEngine();
  const [state, setState] = useState<FlowState>(engine.getState());
  const [currentThread, setCurrentThread] = useState<ThoughtThread | null>(engine.getCurrentThread());

  const sync = useCallback(() => {
    setState(engine.getState());
    setCurrentThread(engine.getCurrentThread());
  }, [engine]);

  useEffect(() => {
    return engine.subscribe(sync);
  }, [engine, sync]);

  return {
    state,
    currentThread,
    
    // Actions
    submitText: async (val: string, type?: import('../types').EntryType) => {
      await engine.submitText(val, type);
      sync();
    },
    appendEntry: async (threadId: string, content: string, type?: import('../types').EntryType) => {
      await engine.appendEntry(threadId, content, type);
      sync();
    },
    setCurrentAction: async (threadId: string, entryId: string | null) => {
      await engine.setCurrentAction(threadId, entryId);
      sync();
    },
    archiveThread: async (threadId: string) => {
      await engine.archiveThread(threadId);
      sync();
    },
    restoreThread: async (threadId: string) => {
      await engine.restoreThread(threadId);
      sync();
    },
    deleteThread: async (threadId: string) => {
      await engine.deleteThread(threadId);
      sync();
    },
    finish: () => {
      engine.reset();
      sync();
    },
    transition: (s: FlowState) => {
      engine.transition(s);
      sync();
    },
    getAllThreads: () => engine.getAllThreads()
  };
}

