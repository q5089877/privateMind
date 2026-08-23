
import { useState, useEffect, useMemo } from 'react';
import { Thought } from '../types';
import { useFlow } from './useFlow';

export type ReviewFilter = 'ALL' | 'ACTION' | 'DEPOSIT';

/**
 * SRP: 此 Hook 專注於回望頁面的資料流與過濾邏輯
 */
export function useThoughts() {
  const { getAllThoughts, deleteThought, updateThought } = useFlow();
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

  const filteredThoughts = useMemo(() => {
    return thoughts.filter(t => {
      if (filter === 'ALL') return true;
      if (filter === 'ACTION') return t.type === 'ACTION' && t.actionStep?.category !== 'D';
      if (filter === 'DEPOSIT') return t.type === 'DEPOSIT' || t.type === 'AWARENESS';
      return true;
    }).sort((a, b) => b.createdAt - a.createdAt);
  }, [thoughts, filter]);

  const handleDelete = async (id: string) => {
    await deleteThought(id);
    setThoughts(prev => prev.filter(t => t.id !== id));
  };

  const handleUpdate = async (thought: Thought) => {
    await updateThought(thought);
    setThoughts(prev => prev.map(t => t.id === thought.id ? thought : t));
  };

  return {
    filteredThoughts,
    filter,
    setFilter,
    loading,
    handleDelete,
    handleUpdate
  };
}
