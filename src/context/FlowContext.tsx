
import React, { createContext, useContext, useMemo } from 'react';
import { HarborFlowEngine } from '../flow/HarborFlowEngine';

const FlowContext = createContext<HarborFlowEngine | null>(null);

export const FlowProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const engine = useMemo(() => new HarborFlowEngine(), []);
    return <FlowContext.Provider value={engine}>{children}</FlowContext.Provider>;
};

export function useFlowEngine(): HarborFlowEngine {
    const engine = useContext(FlowContext);
    if (!engine) {
        throw new Error('useFlowEngine must be used within <FlowProvider>');
    }
    return engine;
}
