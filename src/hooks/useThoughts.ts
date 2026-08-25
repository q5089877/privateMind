import { useState, useEffect, useMemo } from 'react';
import { Thought } from '../types';
import { useFlow } from './useFlow';

export type ReviewFilter = 'ALL' | 'ACTION' | 'DEPOSIT' | 'RELEASED';

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
    return thoughts.filter(t => 
      t.currentDisposition !== 'RELEASE' && t.actionStep?.disposition !== 'NOT_PROCESS'
    ).sort((a, b) => b.createdAt - a.createdAt);
  }, [thoughts]);

  const releasedThoughts = useMemo(() => {
    return thoughts.filter(t => 
      t.currentDisposition === 'RELEASE' || t.actionStep?.disposition === 'NOT_PROCESS'
    ).sort((a, b) => b.createdAt - a.createdAt);
  }, [thoughts]);

  const displayedThoughts = useMemo(() => {
    return thoughts.filter(t => {
      const isReleased = t.currentDisposition === 'RELEASE' || t.actionStep?.disposition === 'NOT_PROCESS';
      
      if (filter === 'ACTION') return t.currentDisposition === 'ACTION' && !isReleased;
      if (filter === 'DEPOSIT') return (t.currentDisposition === 'DEPOSIT' || t.awarenessOnly) && !isReleased;
      if (filter === 'RELEASED') return isReleased;
      // ALL: 保留所有念頭，已放下的念頭以鬆手（Unclenched）靜默態呈現
      return true;
    }).sort((a, b) => b.createdAt - a.createdAt);
  }, [thoughts, filter]);

  const handleDelete = async (id: string) => {
    setThoughts(prev => prev.filter(t => t.id !== id));
    await deleteThought(id);
  };

  const handleUpdate = async (thought: Thought) => {
    setThoughts(prev => prev.map(t => t.id === thought.id ? thought : t));
    await updateThought(thought);
  };

  const handleRelease = async (id: string) => {
    setThoughts(prev => prev.map(t => t.id === id ? { ...t, currentDisposition: 'RELEASE' } : t));
    await releaseThought(id);
  };

  const handleAddAddition = async (thoughtId: string, addition: import('../types').ThoughtAddition) => {
    setThoughts(prev => {
      const newThoughts = [...prev];
      const index = newThoughts.findIndex(t => t.id === thoughtId);
      if (index !== -1) {
        const updatedThought = { ...newThoughts[index] };
        updatedThought.additions = [...(updatedThought.additions || []), addition];
        newThoughts[index] = updatedThought;
        updateThought(updatedThought); // Async fire-and-forget to storage
      }
      return newThoughts;
    });
  };

  const handleRemoveAddition = async (thoughtId: string, additionId: string) => {
    setThoughts(prev => {
      const newThoughts = [...prev];
      const index = newThoughts.findIndex(t => t.id === thoughtId);
      if (index !== -1) {
        const updatedThought = { ...newThoughts[index] };
        if (updatedThought.additions) {
          updatedThought.additions = updatedThought.additions.filter(a => a.id !== additionId);
          newThoughts[index] = updatedThought;
          updateThought(updatedThought); // Async fire-and-forget to storage
        }
      }
      return newThoughts;
    });
  };

  return {
    activeThoughts,
    releasedThoughts,
    displayedThoughts,
    filter,
    setFilter,
    loading,
    handleDelete,
    handleUpdate,
    handleRelease,
    handleAddAddition,
    handleRemoveAddition
  };
}
