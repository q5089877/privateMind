import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';
import { ThoughtCard } from './ThoughtCard';
import { useThoughts } from '../hooks/useThoughts';
import { UI_TEXT } from '../config/textConfig';

const itemVariants = {
  initial: { opacity: 0, y: -4 },
  animate: { 
    opacity: 1, 
    y: 0, 
    transition: { duration: 0.25, ease: 'easeOut' } 
  },
  exit: {
    opacity: 0,
    y: 6,
    transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] }
  }
};

interface ReviewScreenProps {
  onClose: () => void;
}

export const ReviewScreen: React.FC<ReviewScreenProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');
  const [lastArchivedId, setLastArchivedId] = useState<string | null>(null);
  const [showRestoreToast, setShowRestoreToast] = useState(false);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restoreToastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const onRestoreClick = (id: string) => {
    handleRestore(id);
    setShowRestoreToast(true);
    if (restoreToastTimeoutRef.current) {
      clearTimeout(restoreToastTimeoutRef.current);
    }
    restoreToastTimeoutRef.current = setTimeout(() => {
      setShowRestoreToast(false);
    }, 2500);
  };

  const onUndoArchive = () => {
    if (lastArchivedId) {
      handleRestore(lastArchivedId);
      setLastArchivedId(null);
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
      setShowRestoreToast(true);
      if (restoreToastTimeoutRef.current) {
        clearTimeout(restoreToastTimeoutRef.current);
      }
      restoreToastTimeoutRef.current = setTimeout(() => {
        setShowRestoreToast(false);
      }, 2500);
    }
  };

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      if (restoreToastTimeoutRef.current) clearTimeout(restoreToastTimeoutRef.current);
    };
  }, []);

  if (loading) return null;

  const currentList = activeTab === 'active' ? activeThreads : archivedThreads;

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }}
      className="w-full max-w-xl pb-24 relative"
    >
      {/* 頂部列：整合 Tab 切換與關閉按鈕，去重複大標題 */}
      <header className="sticky top-0 bg-canvas/95 backdrop-blur-md py-3.5 z-20 flex items-center justify-between border-b border-border-base/50 mb-6">
        <div className="inline-flex p-1 rounded-xl bg-surface-muted/60 border border-border-base/40 gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('active')}
            className={`px-3.5 py-1 text-xs rounded-lg transition-colors cursor-pointer ${
              activeTab === 'active'
                ? 'bg-surface text-ink font-medium shadow-xs'
                : 'text-ink-muted hover:text-ink'
            }`}
          >
            {UI_TEXT.review.tabActive}（{activeThreads.length}）
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
            {UI_TEXT.review.tabArchived}（{archivedThreads.length}）
          </button>
        </div>

        <button 
          type="button"
          onClick={onClose} 
          className="p-2 text-ink-muted hover:text-ink hover:bg-surface-hover rounded-full transition-colors cursor-pointer"
          title="關閉"
        >
          <X size={18} />
        </button>
      </header>

      {/* 純文字流動排版（去卡片化） */}
      <div className="space-y-0 divide-y divide-border-base/35">
        {currentList.length === 0 ? (
          <div className="py-24 text-center text-ink-muted/70 font-light text-sm">
            {activeTab === 'active' ? UI_TEXT.review.emptyState : UI_TEXT.review.emptyArchivedState}
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {currentList.map((thread) => (
              <motion.div
                key={thread.id}
                layout
                variants={itemVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ layout: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } }}
                className="py-7 first:pt-2"
              >
                <ThoughtCard 
                  thread={thread} 
                  isArchivedView={activeTab === 'archived'}
                  onDelete={() => onDeleteClick(thread.id)}
                  onArchive={() => onArchiveClick(thread.id)}
                  onRestore={() => onRestoreClick(thread.id)}
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
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
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

      {/* 還原完成提示：已回來。 */}
      <AnimatePresence>
        {showRestoreToast && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.25 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-ink text-surface px-4 py-2 rounded-full text-xs shadow-lg flex items-center select-none"
          >
            <span>{UI_TEXT.review.toastRestored}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
