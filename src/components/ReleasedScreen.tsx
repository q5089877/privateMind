import React from 'react';
import { motion } from 'motion/react';
import { ArrowLeft } from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';
import { ThoughtCard } from './ThoughtCard';
import { useThoughts } from '../hooks/useThoughts';
import { useFlow } from '../hooks/useFlow';
import { UI_TEXT } from '../config/textConfig';

export const ReleasedScreen: React.FC = () => {
  const { releasedThoughts, loading, handleDelete, handleAddAddition, handleRemoveAddition } = useThoughts();
  const { transition } = useFlow();

  const onDeleteClick = (id: string) => {
    triggerHaptic(25);
    handleDelete(id);
  };



  if (loading) return null;

  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="w-full max-w-2xl space-y-6 pb-16"
    >
      <div className="flex items-center sticky top-0 bg-canvas/95 backdrop-blur-md py-4 z-10 border-b border-border-base">
        <button 
          onClick={() => { triggerHaptic(10); transition('REVIEW'); }}
          className="p-2 -ml-2 text-ink-secondary hover:text-ink hover:bg-surface-hover rounded-full transition-colors cursor-pointer flex items-center gap-1.5"
        >
          <ArrowLeft size={18} />
          <span className="text-sm">{UI_TEXT.released.backBtn}</span>
        </button>
      </div>

      <div className="space-y-1.5 sm:space-y-2 mb-8 sm:mb-12 text-center pt-4">
        <h2 className="text-2xl sm:text-3xl font-light text-ink">{UI_TEXT.released.title}</h2>
        <p className="text-ink-secondary font-light text-sm sm:text-base whitespace-pre-wrap">{UI_TEXT.released.subtitle}</p>
      </div>

      <div className="space-y-4">
        {releasedThoughts.length === 0 ? (
          <div className="py-20 text-center text-ink-muted font-light">
            {UI_TEXT.released.emptyState}
          </div>
        ) : (
          releasedThoughts.map((t, idx) => (
            <ThoughtCard 
              key={`released-${t.id}-${idx}`} 
              thought={t} 
              onDelete={() => onDeleteClick(t.id)}
              onRelease={() => {}}
              onUpdate={() => {}}
              onAddAddition={(addition) => handleAddAddition(t.id, addition)}
              onRemoveAddition={(additionId) => handleRemoveAddition(t.id, additionId)}
            />
          ))
        )}
      </div>
    </motion.div>
  );
};
