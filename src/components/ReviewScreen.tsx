import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';
import { ThoughtCard } from './ThoughtCard';
import { useThoughts } from '../hooks/useThoughts';
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

interface ReviewScreenProps {
  onClose: () => void;
}

export const ReviewScreen: React.FC<ReviewScreenProps> = ({ onClose }) => {
  const { 
    displayedThreads, loading, 
    handleDelete, handleRelease, handleAppend
  } = useThoughts();

  const onDeleteClick = (id: string) => {
    triggerHaptic('release');
    handleDelete(id);
  };

  const onReleaseClick = (id: string) => {
    triggerHaptic('release');
    handleRelease(id);
  };

  if (loading) return null;

  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="w-full max-w-2xl space-y-6 pb-16"
    >
      <ReviewHeader onClose={onClose} />

      <div className="space-y-1.5 sm:space-y-2 mb-8 sm:mb-12 text-center">
        <h2 className="text-2xl sm:text-3xl font-light text-ink">{UI_TEXT.review.title}</h2>
        <p className="text-ink-secondary font-light text-sm sm:text-base">{UI_TEXT.review.subtitle}</p>
      </div>

      <div className="space-y-4">
        {displayedThreads.length === 0 ? (
          <EmptyState />
        ) : (
          <AnimatePresence mode="popLayout">
            {displayedThreads.map((thread) => (
              <motion.div
                key={thread.id}
                layout
                variants={cardVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ layout: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } }}
              >
                <ThoughtCard 
                  thread={thread} 
                  onDelete={() => onDeleteClick(thread.id)}
                  onRelease={() => onReleaseClick(thread.id)}
                  onAppend={(content) => handleAppend(thread.id, content)}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </motion.div>
  );
};

const ReviewHeader: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <div className="flex items-center justify-between sticky top-0 bg-canvas/95 backdrop-blur-md py-4 z-10 border-b border-border-base">
    <h2 className="text-xl sm:text-2xl font-light text-ink">{UI_TEXT.review.title}</h2>
    <button onClick={onClose} className="p-2 text-ink-secondary hover:bg-surface-hover rounded-full transition-colors cursor-pointer">
      <X size={20} />
    </button>
  </div>
);

const EmptyState = () => (
  <div className="py-20 text-center text-ink-muted font-light">
    {UI_TEXT.review.emptyState}
  </div>
);

