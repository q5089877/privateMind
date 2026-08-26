import { useState, useEffect, useMemo } from 'react';
import { Thought, ThoughtAddition } from '../types';
import { useFlow } from './useFlow';

/**
 * SRP: 此 Hook 專注於「重新遇見」頁面的資料流
 */
export function useThoughts() {
  const { getAllThoughts, deleteThought, updateThought, releaseThought } = useFlow();
  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const data = await getAllThoughts();
      setThoughts(data);
      setLoading(false);
    };
    fetch();
  }, []);

  const displayedThoughts = useMemo(() => {
    return [...thoughts].sort((a, b) => b.createdAt - a.createdAt);
  }, [thoughts]);

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

  const handleAddAddition = async (thoughtId: string, addition: ThoughtAddition) => {
    setThoughts(prev => {
      const newThoughts = [...prev];
      const index = newThoughts.findIndex(t => t.id === thoughtId);
      if (index !== -1) {
        const updatedThought = { ...newThoughts[index] };
        updatedThought.additions = [...(updatedThought.additions || []), addition];
        newThoughts[index] = updatedThought;
        updateThought(updatedThought);
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
          updateThought(updatedThought);
        }
      }
      return newThoughts;
    });
  };

  return {
    displayedThoughts,
    loading,
    handleDelete,
    handleUpdate,
    handleRelease,
    handleAddAddition,
    handleRemoveAddition
  };
}
