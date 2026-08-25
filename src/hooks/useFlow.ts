import { useState, useCallback, useEffect } from 'react';
import { useFlowEngine } from '../context/FlowContext';
import { FlowState, Thought, AppSettings, RetentionSetting } from '../types';

/**
 * SRP: 此 Hook 僅負責 React 狀態與 FlowEngine 實例的同步
 */
export function useFlow() {
  const engine = useFlowEngine();
  const [state, setState] = useState<FlowState>(engine.getState());
  const [content, setContent] = useState<string>(engine.getContent());

  const sync = useCallback(() => {
    setState(engine.getState());
    setContent(engine.getContent());
  }, [engine]);

  useEffect(() => {
    return engine.subscribe(sync);
  }, [engine, sync]);

  return {
    state,
    content,
    thought: engine.getThought(),
    settings: engine.getSettings(),
    
    // Actions
    setup: (retention: RetentionSetting) => { engine.setInitialSettings(retention); sync(); },
    startInput: () => { engine.startInput(); sync(); },
    submit: (val: string) => { engine.submitInput(val); sync(); },
    handleAwareness: () => { engine.handleAwareness(); sync(); },
    startDeposit: () => { engine.startDeposit(); sync(); },
    startAction: () => { engine.startAction(); sync(); },
    submitActionStep: (text: string) => { engine.submitActionStep(text); sync(); },
    releaseThought: async (id: string) => {
      await engine.releaseThought(id);
      sync();
    },
    finish: () => { engine.reset(); sync(); },
    transition: (s: FlowState) => { engine.transition(s); sync(); },
    getAllThoughts: () => engine.getAllThoughts(),
    deleteThought: (id: string) => { engine.deleteThought(id); sync(); },
    updateThought: (t: Thought) => { engine.updateThought(t); sync(); },
    saveSettings: (s: Partial<AppSettings>) => { engine.saveSettings(s); sync(); }
  };
}
