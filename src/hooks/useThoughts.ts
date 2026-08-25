import { useState, useEffect, useMemo } from 'react';
import { Thought } from '../types';
import { useFlow } from './useFlow';

export type ReviewFilter = 'ALL' | 'ACTION' | 'DEPOSIT';

/**
 * SRP: 此 Hook 專注於回望頁面的資料流與過濾邏輯
 */
export function useThoughts() {
  const { getAllThoughts, deleteThought, updateThought, releaseThought } = useFlow();
  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const [filter, setFilter] = useState<ReviewFilter>('ALL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const data = await getAllThoughts();
      setThoughts(data);
      setLoading(false);
    };
    fetch();
  }, []);

  const activeThoughts = useMemo(() => {
    return thoughts.filter(t => {
      const isReleased = t.currentDisposition === 'RELEASE' || t.actionStep?.disposition === 'NOT_PROCESS';
      if (isReleased) return false;
      
      if (filter === 'ALL') return true;
      if (filter === 'ACTION') return t.currentDisposition === 'ACTION';
      if (filter === 'DEPOSIT') return t.currentDisposition === 'DEPOSIT' || t.awarenessOnly;
      return true;
    }).sort((a, b) => b.createdAt - a.createdAt);
  }, [thoughts, filter]);

  const releasedThoughts = useMemo(() => {
    return thoughts.filter(t => 
      t.currentDisposition === 'RELEASE' || t.actionStep?.disposition === 'NOT_PROCESS'
    ).sort((a, b) => b.createdAt - a.createdAt);
  }, [thoughts]);

  const handleDelete = async (id: string) => {
    await deleteThought(id);
    setThoughts(prev => prev.filter(t => t.id !== id));
  };

  const handleUpdate = async (thought: Thought) => {
    await updateThought(thought);
    setThoughts(prev => prev.map(t => t.id === thought.id ? thought : t));
  };

  const handleRelease = async (id: string) => {
    await releaseThought(id);
    setThoughts(prev => prev.map(t => t.id === id ? { ...t, currentDisposition: 'RELEASE' } : t));
  };

  return {
    activeThoughts,
    releasedThoughts,
    filter,
    setFilter,
    loading,
    handleDelete,
    handleUpdate,
    handleRelease
  };
}
