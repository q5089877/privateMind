import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft } from 'lucide-react';
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
  // 18｜已收起空間開關
  const [isViewingArchived, setIsViewingArchived] = useState(false);
  const [showDrawerMenu, setShowDrawerMenu] = useState(false);
  const [lastArchivedId, setLastArchivedId] = useState<string | null>(null);
  const [showRestoreToast, setShowRestoreToast] = useState(false);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restoreToastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    activeThreads, archivedThreads, loading,
    handleDelete, handleArchive, handleRestore, handleAppend
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

  const currentList = isViewingArchived ? archivedThreads : activeThreads;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="w-full max-w-xl pb-24 relative"
    >
      {/* 07｜去管理化時間線頂部導航 */}
      <header className="sticky top-0 bg-canvas/95 backdrop-blur-md py-3.5 z-20 flex items-center justify-between border-b border-border-base/40 mb-6">
        {isViewingArchived ? (
          /* 【已收起空間】頂部：< 回去 / 標題 */
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsViewingArchived(false)}
              className="p-1.5 text-ink-muted hover:text-ink transition-colors cursor-pointer rounded-full flex items-center gap-1 text-sm font-light"
            >
              <ArrowLeft size={16} />
              <span>{UI_TEXT.hiddenSpace.backBtn.replace('←', '').trim()}</span>
            </button>
            <span className="text-sm font-medium text-ink">
              {UI_TEXT.hiddenSpace.title}
            </span>
          </div>
        ) : (
          /* 【正常時間線】頂部：純返回 ←，無標題、無計數 */
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-ink-muted hover:text-ink hover:bg-surface-hover rounded-full transition-colors cursor-pointer"
            title="返回"
          >
            <ArrowLeft size={18} />
          </button>
        )}

        {/* 右側 17｜隱形抽屜 (···)：收納「已收起」空間 */}
        {!isViewingArchived && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowDrawerMenu(prev => !prev)}
              className="text-ink-muted/70 hover:text-ink cursor-pointer px-2 py-1 text-sm tracking-widest transition-colors select-none"
              title="選單"
            >
              {UI_TEXT.menu.trigger}
            </button>

            {showDrawerMenu && (
              <div className="absolute right-0 top-full mt-1.5 py-1 px-1 bg-surface border border-border-base rounded-xl shadow-md z-30 whitespace-nowrap min-w-[110px] space-y-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setShowDrawerMenu(false);
                    setIsViewingArchived(true);
                  }}
                  className="w-full text-left text-xs text-ink-secondary hover:text-ink hover:bg-surface-hover px-3 py-2 rounded-lg cursor-pointer transition-colors"
                >
                  {UI_TEXT.menu.hiddenSpaceItem}
                </button>
              </div>
            )}
          </div>
        )}
      </header>

      {/* 純文字流動排版（去卡片框線） */}
      <div className="space-y-0 divide-y divide-border-base/35">
        {currentList.length === 0 ? (
          <div className="py-24 text-center text-ink-muted/70 font-light text-sm">
            {isViewingArchived ? UI_TEXT.hiddenSpace.emptyState : UI_TEXT.review.emptyState}
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
                  isArchivedView={isViewingArchived}
                  onDelete={() => onDeleteClick(thread.id)}
                  onArchive={() => onArchiveClick(thread.id)}
                  onRestore={() => onRestoreClick(thread.id)}
                  onAppend={(content, type) => handleAppend(thread.id, content, type)}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* 09｜「收起來」反悔 Toast：已收起 · 復原 */}
      <AnimatePresence>
        {lastArchivedId && !isViewingArchived && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.25 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-ink text-surface px-4 py-2 rounded-full text-xs shadow-lg flex items-center gap-3 select-none"
          >
            <span>{UI_TEXT.review.toastTuckedAway}</span>
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

      {/* 放回眼前完成提示：已放回眼前。 */}
      <AnimatePresence>
        {showRestoreToast && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.25 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-ink text-surface px-4 py-2 rounded-full text-xs shadow-lg flex items-center select-none"
          >
            <span>{UI_TEXT.review.toastBroughtBack}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

