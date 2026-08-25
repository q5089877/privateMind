
import { useState, useCallback, useEffect } from 'react';
import { useFlowEngine } from '../context/FlowContext';
import { FlowState, Thought, AppSettings, RetentionSetting, ActionDisposition } from '../types';

/**
 * SRP: 此 Hook 僅負責 React 狀態與 FlowEngine 實例的同步
 * FlowEngine singleton 由 FlowContext 提供，所有 consumer 共享同一 instance
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
    confirmDeposit: () => { engine.confirmDeposit(); sync(); },
    startAction: () => { engine.startAction(); sync(); },
    defineActionStep: (text: string) => { engine.defineActionStep(text); sync(); },
    setDisposition: (disp: ActionDisposition, person?: string, scheduledAt?: string) => { 
      engine.setActionDisposition(disp, person, scheduledAt); 
      sync(); 
    },
    releaseThought: async (id: string) => {
      await engine.releaseThought(id);
      sync();
    },
    cancelEvolve: () => { engine.cancelEvolve(); sync(); },
    finish: () => { engine.reset(); sync(); },
    transition: (s: FlowState) => { engine.transition(s); sync(); },
    getAllThoughts: () => engine.getAllThoughts(),
    deleteThought: (id: string) => { engine.deleteThought(id); sync(); },
    updateThought: (t: Thought) => { engine.updateThought(t); sync(); },
    saveSettings: (s: Partial<AppSettings>) => { engine.saveSettings(s); sync(); }
  };
}
