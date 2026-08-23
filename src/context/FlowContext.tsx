
import React, { createContext, useContext, useMemo } from 'react';
import { FlowEngine } from '../logic/FlowEngine';

const FlowContext = createContext<FlowEngine | null>(null);

export const FlowProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const engine = useMemo(() => new FlowEngine(), []);
    return <FlowContext.Provider value={engine}>{children}</FlowContext.Provider>;
};

export function useFlowEngine(): FlowEngine {
    const engine = useContext(FlowContext);
    if (!engine) {
        throw new Error('useFlowEngine must be used within <FlowProvider>');
    }
    return engine;
}
