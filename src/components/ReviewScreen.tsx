import React from 'react';
import { motion } from 'motion/react';
import { X } from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';
import { ThoughtCard } from './ThoughtCard';
import { useThoughts, ReviewFilter } from '../hooks/useThoughts';
import { Thought } from '../types';
import { useFlow } from '../hooks/useFlow';
import { UI_TEXT } from '../config/textConfig';

interface ReviewScreenProps {
  onClose: () => void;
}

export const ReviewScreen: React.FC<ReviewScreenProps> = ({ onClose }) => {
  const { 
    displayedThoughts, filter, setFilter, loading, 
    handleDelete, handleUpdate, handleRelease, handleAddAddition, handleRemoveAddition
  } = useThoughts();
  
  const { transition } = useFlow();

  const onDeleteClick = (id: string) => {
    triggerHaptic(25);
    handleDelete(id);
  };

  const onReleaseClick = (id: string) => {
    triggerHaptic(25);
    handleRelease(id);
  };

  const onUpdateClick = (t: Thought) => {
    triggerHaptic(15);
    handleUpdate(t);
  };

  if (loading) return null;

  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="w-full max-w-2xl space-y-6 pb-16"
    >
      <ReviewHeader filter={filter} setFilter={setFilter} onClose={onClose} />

      <div className="space-y-1.5 sm:space-y-2 mb-8 sm:mb-12 text-center">
        <h2 className="text-2xl sm:text-3xl font-light text-[#424242]">{UI_TEXT.review.title}</h2>
        <p className="text-[#5E5E5E] font-light text-sm sm:text-base">{UI_TEXT.review.subtitle}</p>
      </div>

      <div className="space-y-4">
        {displayedThoughts.length === 0 ? (
          <EmptyState />
        ) : (
          displayedThoughts.map((t, idx) => (
            <ThoughtCard 
              key={`thought-${t.id}-${idx}`} 
              thought={t} 
              onDelete={() => onDeleteClick(t.id)}
              onRelease={() => onReleaseClick(t.id)}
              onUpdate={onUpdateClick}
              onAddAddition={(addition) => handleAddAddition(t.id, addition)}
              onRemoveAddition={(additionId) => handleRemoveAddition(t.id, additionId)}
            />
          ))
        )}
      </div>
      
      <div className="pt-12 pb-8 text-center">
        <button 
          onClick={() => { triggerHaptic(10); transition('RELEASED_VIEW'); }}
          className="text-sm text-[#A3A3A3] hover:text-[#5E5E5E] transition-colors cursor-pointer"
        >
          {UI_TEXT.released.title} →
        </button>
      </div>
    </motion.div>
  );
};

const ReviewHeader: React.FC<{ filter: ReviewFilter, setFilter: (f: ReviewFilter) => void, onClose: () => void }> = 
({ filter, setFilter, onClose }) => (
  <div className="flex items-center justify-between sticky top-0 bg-[#F7F7F4]/95 backdrop-blur-md py-4 z-10 border-b border-[#E8E8E4]">
    <h2 className="text-xl sm:text-2xl font-light text-[#2C2C2C]">{UI_TEXT.review.title}</h2>
    <div className="flex gap-3 items-center">
      <select 
        value={filter}
        onChange={(e) => setFilter(e.target.value as any)}
        className="text-sm bg-[#EAEAE6] text-[#2C2C2C] rounded-full px-3.5 py-1.5 outline-none cursor-pointer"
      >
        <option value="ALL">{UI_TEXT.review.filters.ALL}</option>
        <option value="ACTION">{UI_TEXT.review.filters.ACTION}</option>
        <option value="DEPOSIT">{UI_TEXT.review.filters.DEPOSIT}</option>
        <option value="RELEASED">{UI_TEXT.review.filters.RELEASED}</option>
      </select>
      <button onClick={onClose} className="p-2 text-[#555555] hover:bg-[#EAEAE6] rounded-full transition-colors cursor-pointer">
        <X size={20} />
      </button>
    </div>
  </div>
);

const EmptyState = () => (
  <div className="py-20 text-center text-[#737373] font-light">
    {UI_TEXT.review.emptyState}
  </div>
);
