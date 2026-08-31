import { useState, useEffect, useMemo, useCallback } from 'react';
import { ThoughtThread } from '../types';
import { useFlowEngine } from '../context/FlowContext';

/**
 * SRP: 此 Hook 專注於「回來看看」頁面的對話線程資料流
 */
export function useThoughts() {
  const engine = useFlowEngine();
  const [threads, setThreads] = useState<ThoughtThread[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    const data = await engine.getAllThreads();
    setThreads(data);
    setLoading(false);
  }, [engine]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const activeThreads = useMemo(() => {
    return threads
      .filter(t => !t.isArchived)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }, [threads]);

  const archivedThreads = useMemo(() => {
    return threads
      .filter(t => !!t.isArchived)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }, [threads]);

  const handleDelete = useCallback(async (id: string) => {
    setThreads(prev => prev.filter(t => t.id !== id));
    await engine.deleteThread(id);
  }, [engine]);

  const handleArchive = useCallback(async (id: string) => {
    setThreads(prev => prev.map(t => t.id === id ? { ...t, isArchived: true, updatedAt: Date.now() } : t));
    await engine.archiveThread(id);
  }, [engine]);

  const handleRestore = useCallback(async (id: string) => {
    setThreads(prev => prev.map(t => t.id === id ? { ...t, isArchived: false, updatedAt: Date.now() } : t));
    await engine.restoreThread(id);
  }, [engine]);

  const handleAppend = useCallback(async (threadId: string, content: string, type?: import('../types').EntryType) => {
    const now = Date.now();
    // 樂觀更新：預先塞入新 Entry，讓 UI 瞬間反饋
    setThreads(prev => prev.map(t => {
      if (t.id === threadId) {
        const newEntry = { 
          id: `opt-${now}`, 
          threadId, 
          content, 
          createdAt: now, 
          type: type || 'thought' 
        };
        return { 
          ...t, 
          entries: [...t.entries, newEntry], 
          updatedAt: now, 
          isArchived: false, 
          currentActionId: type === 'action' ? newEntry.id : t.currentActionId 
        };
      }
      return t;
    }));
    await engine.appendEntry(threadId, content, type);
    fetch(); // 背景回填真實 ID 與正確資料
  }, [engine, fetch]);

  const handleEdit = useCallback(async (threadId: string, entryId: string, content: string) => {
    // 樂觀更新：直接改掉對應的文字
    setThreads(prev => prev.map(t => {
      if (t.id === threadId) {
        return { 
          ...t, 
          entries: t.entries.map(e => e.id === entryId ? { ...e, content } : e), 
          updatedAt: Date.now() 
        };
      }
      return t;
    }));
    await engine.updateEntry(threadId, entryId, content);
    fetch();
  }, [engine, fetch]);

  const handleSetCurrentAction = useCallback(async (threadId: string, entryId: string | null) => {
    setThreads(prev => prev.map(t => t.id === threadId ? { ...t, currentActionId: entryId, updatedAt: Date.now() } : t));
    await engine.setCurrentAction(threadId, entryId);
    fetch();
  }, [engine, fetch]);

  const handleCreateTray = useCallback(async (threadId: string, name?: string) => {
    const trayId = await engine.createTray(threadId, name);
    fetch();
    return trayId;
  }, [engine, fetch]);

  const handleMoveEntryToTray = useCallback(async (threadId: string, entryId: string, trayId: string | undefined) => {
    setThreads(prev => prev.map(t => {
      if (t.id === threadId) {
        return {
          ...t,
          entries: t.entries.map(e => e.id === entryId ? { ...e, trayId } : e),
          updatedAt: Date.now()
        };
      }
      return t;
    }));
    await engine.moveEntryToTray(threadId, entryId, trayId);
    fetch();
  }, [engine, fetch]);

  const handleSavePileAnalysis = useCallback(async (threadId: string, labels: Record<string, string>, observations: string[]) => {
    await engine.savePileAnalysis(threadId, labels, observations);
    fetch();
  }, [engine, fetch]);

  const handleStartSorting = useCallback(async (threadId: string) => {
    await engine.ensureTrays(threadId, 4);
    fetch();
  }, [engine, fetch]);

  return {
    activeThreads,
    archivedThreads,
    displayedThreads: activeThreads,
    loading,
    handleDelete,
    handleArchive,
    handleRestore,
    handleAppend,
    handleEdit,
    handleSetCurrentAction,
    handleCreateTray,
    handleMoveEntryToTray,
    handleSavePileAnalysis,
    handleStartSorting,
    refresh: fetch
  };
}

