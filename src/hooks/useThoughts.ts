import { useState, useEffect, useMemo, useCallback } from 'react';
import { ThoughtThread, MomentIntent } from '../types';
import { useFlowEngine } from '../context/FlowContext';

export function useThoughts() {
  const engine = useFlowEngine();
  const [threads, setThreads] = useState<ThoughtThread[]>([]);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => { setThreads(await engine.getAllThreads()); setLoading(false); }, [engine]);
  useEffect(() => { void refresh(); return engine.subscribe(() => { void refresh(); }); }, [engine, refresh]);
  const activeThreads = useMemo(() => threads.filter(item => !item.isArchived).sort((a, b) => b.updatedAt - a.updatedAt), [threads]);
  const archivedThreads = useMemo(() => threads.filter(item => item.isArchived).sort((a, b) => b.updatedAt - a.updatedAt), [threads]);
  return {
    activeThreads, archivedThreads, loading, refresh,
    append: async (id: string, content: string, intent: MomentIntent) => { await engine.appendEntry(id, content, intent); await refresh(); },
    archive: async (id: string) => { await engine.archiveThread(id); await refresh(); },
    restore: async (id: string) => { await engine.restoreThread(id); await refresh(); },
    remove: async (id: string) => { await engine.deleteThread(id); await refresh(); },
    edit: async (threadId: string, entryId: string, content: string) => { await engine.updateEntry(threadId, entryId, content); await refresh(); }
  };
}
