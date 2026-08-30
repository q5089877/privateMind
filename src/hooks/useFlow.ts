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
    },
    submitSayNothing: async () => {
      await engine.submitSayNothing();
    },
    appendEntry: async (threadId: string, content: string, type?: import('../types').EntryType) => {
      await engine.appendEntry(threadId, content, type);
    },
    updateEntry: async (threadId: string, entryId: string, content: string) => {
      await engine.updateEntry(threadId, entryId, content);
    },
    setCurrentAction: async (threadId: string, entryId: string | null) => {
      await engine.setCurrentAction(threadId, entryId);
    },
    archiveThread: async (threadId: string) => {
      await engine.archiveThread(threadId);
    },
    restoreThread: async (threadId: string) => {
      await engine.restoreThread(threadId);
    },
    deleteThread: async (threadId: string) => {
      await engine.deleteThread(threadId);
    },
    finish: () => {
      engine.reset();
    },
    transition: (s: FlowState) => {
      engine.transition(s);
    },
    getAllThreads: () => engine.getAllThreads()
  };
}

