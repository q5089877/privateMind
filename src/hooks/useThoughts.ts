import { useState, useEffect, useMemo } from 'react';
import { ThoughtThread } from '../types';
import { useFlow } from './useFlow';

/**
 * SRP: 此 Hook 專注於「回來看看」頁面的對話線程資料流
 */
export function useThoughts() {
  const { getAllThreads, deleteThread, appendEntry, setCurrentAction, archiveThread, restoreThread } = useFlow();
  const [threads, setThreads] = useState<ThoughtThread[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = async () => {
    const data = await getAllThreads();
    setThreads(data);
    setLoading(false);
  };

  useEffect(() => {
    fetch();
  }, []);

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

  const handleDelete = async (id: string) => {
    setThreads(prev => prev.filter(t => t.id !== id));
    await deleteThread(id);
  };

  const handleArchive = async (id: string) => {
    setThreads(prev => prev.map(t => t.id === id ? { ...t, isArchived: true } : t));
    await archiveThread(id);
  };

  const handleRestore = async (id: string) => {
    setThreads(prev => prev.map(t => t.id === id ? { ...t, isArchived: false } : t));
    await restoreThread(id);
  };

  const handleAppend = async (threadId: string, content: string, type?: import('../types').EntryType) => {
    await appendEntry(threadId, content, type);
    await fetch();
  };

  const handleSetCurrentAction = async (threadId: string, entryId: string | null) => {
    await setCurrentAction(threadId, entryId);
    await fetch();
  };

  return {
    activeThreads,
    archivedThreads,
    displayedThreads: activeThreads,
    loading,
    handleDelete,
    handleArchive,
    handleRestore,
    handleAppend,
    handleSetCurrentAction,
    refresh: fetch
  };
}

