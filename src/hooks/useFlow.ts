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
    submitText: async (val: string) => {
      await engine.submitText(val);
      sync();
    },
    submitUnspoken: async () => {
      await engine.submitUnspoken();
      sync();
    },
    appendEntry: async (threadId: string, content: string) => {
      await engine.appendEntry(threadId, content);
      sync();
    },
    releaseThread: async (threadId: string) => {
      await engine.releaseThread(threadId);
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

