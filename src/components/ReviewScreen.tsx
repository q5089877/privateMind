import React, { useState, useRef, useEffect } from 'react';
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
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] }
  }
};

interface ReviewScreenProps {
  onClose: () => void;
}

export const ReviewScreen: React.FC<ReviewScreenProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');
  const [lastArchivedId, setLastArchivedId] = useState<string | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { 
    activeThreads, archivedThreads, loading, 
    handleDelete, handleArchive, handleRestore, handleAppend, handleSetCurrentAction
  } = useThoughts();

  const onDeleteClick = (id: string) => {
    triggerHaptic('release');
    handleDelete(id);
  };

  const onArchiveClick = (id: string) => {
    setLastArchivedId(id);
    handleArchive(id);
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    toastTimeoutRef.current = setTimeout(() => {
      setLastArchivedId(null);
    }, 4500);
  };

  const onUndoArchive = () => {
    if (lastArchivedId) {
      handleRestore(lastArchivedId);
      setLastArchivedId(null);
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    }
  };

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  if (loading) return null;

  const currentList = activeTab === 'active' ? activeThreads : archivedThreads;
  const currentTitle = activeTab === 'active' ? UI_TEXT.review.title : UI_TEXT.review.archivedTitle;

  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="w-full max-w-2xl space-y-6 pb-20 relative"
    >
      <ReviewHeader title={currentTitle} onClose={onClose} />

      <div className="space-y-3 mb-6 text-center">
        <h2 className="text-2xl sm:text-3xl font-light text-ink">{currentTitle}</h2>

        {/* 頁籤切換：時間線 vs 封存 */}
        <div className="inline-flex p-1 rounded-xl bg-surface-muted/60 border border-border-base/50 gap-1 mt-2">
          <button
            type="button"
            onClick={() => setActiveTab('active')}
            className={`px-3.5 py-1 text-xs rounded-lg transition-colors cursor-pointer ${
              activeTab === 'active'
                ? 'bg-surface text-ink font-medium shadow-xs'
                : 'text-ink-muted hover:text-ink'
            }`}
          >
            {UI_TEXT.review.tabActive} ({activeThreads.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('archived')}
            className={`px-3.5 py-1 text-xs rounded-lg transition-colors cursor-pointer ${
              activeTab === 'archived'
                ? 'bg-surface text-ink font-medium shadow-xs'
                : 'text-ink-muted hover:text-ink'
            }`}
          >
            {UI_TEXT.review.tabArchived} ({archivedThreads.length})
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {currentList.length === 0 ? (
          <EmptyState message={activeTab === 'active' ? UI_TEXT.review.emptyState : UI_TEXT.review.emptyArchivedState} />
        ) : (
          <AnimatePresence mode="popLayout">
            {currentList.map((thread) => (
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
                  isArchivedView={activeTab === 'archived'}
                  onDelete={() => onDeleteClick(thread.id)}
                  onArchive={() => onArchiveClick(thread.id)}
                  onRestore={() => handleRestore(thread.id)}
                  onLeave={onClose}
                  onAppend={(content, type) => handleAppend(thread.id, content, type)}
                  onSetCurrentAction={(entryId) => handleSetCurrentAction(thread.id, entryId)}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* 封存反悔 Toast：已封存 · 復原 */}
      <AnimatePresence>
        {lastArchivedId && activeTab === 'active' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            transition={{ duration: 0.25 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-ink text-surface px-4 py-2 rounded-full text-xs shadow-lg flex items-center gap-3 select-none"
          >
            <span>{UI_TEXT.review.toastArchived}</span>
            <span className="text-surface/40">·</span>
            <button
              type="button"
              onClick={onUndoArchive}
              className="text-surface font-medium hover:underline cursor-pointer"
            >
              {UI_TEXT.review.toastUndo}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const ReviewHeader: React.FC<{ title: string; onClose: () => void }> = ({ title, onClose }) => (
  <div className="flex items-center justify-between sticky top-0 bg-canvas/95 backdrop-blur-md py-4 z-10 border-b border-border-base">
    <h2 className="text-xl sm:text-2xl font-light text-ink">{title}</h2>
    <button onClick={onClose} className="p-2 text-ink-secondary hover:bg-surface-hover rounded-full transition-colors cursor-pointer">
      <X size={20} />
    </button>
  </div>
);

const EmptyState: React.FC<{ message?: string }> = ({ message }) => (
  <div className="py-20 text-center text-ink-muted font-light">
    {message || UI_TEXT.review.emptyState}
  </div>
);


