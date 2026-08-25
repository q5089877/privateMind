import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft } from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';
import { ThoughtCard } from './ThoughtCard';
import { useThoughts } from '../hooks/useThoughts';
import { useFlow } from '../hooks/useFlow';
import { UI_TEXT } from '../config/textConfig';

const cardVariants = {
  initial: { opacity: 0, y: -6 },
  animate: { 
    opacity: 1, 
    y: 0, 
    scale: 1, 
    filter: 'blur(0px)', 
    transition: { duration: 0.3, ease: 'easeOut' } 
  },
  exit: {
    y: 8,
    scale: 0.98,
    opacity: 0,
    filter: 'blur(4px)',
    transition: { duration: 1.0, ease: [0.16, 1, 0.3, 1] }
  }
};

export const ReleasedScreen: React.FC = () => {
  const { releasedThoughts, loading, handleDelete, handleAddAddition, handleRemoveAddition } = useThoughts();
  const { transition } = useFlow();

  const onDeleteClick = (id: string) => {
    triggerHaptic('release');
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
          onClick={() => transition('REVIEW')}
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
          <AnimatePresence mode="popLayout">
            {releasedThoughts.map((t) => (
              <motion.div
                key={t.id}
                layout
                variants={cardVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ layout: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } }}
              >
                <ThoughtCard 
                  thought={t} 
                  onDelete={() => onDeleteClick(t.id)}
                  onRelease={() => {}}
                  onUpdate={() => {}}
                  onAddAddition={(addition) => handleAddAddition(t.id, addition)}
                  onRemoveAddition={(additionId) => handleRemoveAddition(t.id, additionId)}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </motion.div>
  );
};
