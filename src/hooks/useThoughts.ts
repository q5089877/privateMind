import { useState, useEffect, useMemo } from 'react';
import { ThoughtThread } from '../types';
import { useFlow } from './useFlow';

/**
 * SRP: 此 Hook 專注於「回來看看」頁面的對話線程資料流
 */
export function useThoughts() {
  const { getAllThreads, deleteThread, appendEntry, updateEntry, setCurrentAction, archiveThread, restoreThread } = useFlow();
  const [threads, setThreads] = useState<ThoughtThread[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    const data = await getAllThreads();
    setThreads(data);
    setLoading(false);
  }, [getAllThreads]);

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
    await deleteThread(id);
  }, [deleteThread]);

  const handleArchive = useCallback(async (id: string) => {
    setThreads(prev => prev.map(t => t.id === id ? { ...t, isArchived: true, updatedAt: Date.now() } : t));
    await archiveThread(id);
  }, [archiveThread]);

  const handleRestore = useCallback(async (id: string) => {
    setThreads(prev => prev.map(t => t.id === id ? { ...t, isArchived: false, updatedAt: Date.now() } : t));
    await restoreThread(id);
  }, [restoreThread]);

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
    await appendEntry(threadId, content, type);
    fetch(); // 背景回填真實 ID 與正確資料
  }, [appendEntry, fetch]);

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
    await updateEntry(threadId, entryId, content);
    fetch();
  }, [updateEntry, fetch]);

  const handleSetCurrentAction = useCallback(async (threadId: string, entryId: string | null) => {
    setThreads(prev => prev.map(t => t.id === threadId ? { ...t, currentActionId: entryId, updatedAt: Date.now() } : t));
    await setCurrentAction(threadId, entryId);
    fetch();
  }, [setCurrentAction, fetch]);

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
    refresh: fetch
  };
}

