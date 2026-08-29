import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft } from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';
import { ThoughtCard } from './ThoughtCard';
import { useThoughts } from '../hooks/useThoughts';
import { UI_TEXT } from '../config/textConfig';
import { groupThreadsByDate } from '../utils/dateUtils';

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

  const currentList = isViewingArchived ? archivedThreads : activeThreads;

  // 07｜自然日期分組與嚴格最新到最舊排序
  const groupedData = useMemo(() => {
    return groupThreadsByDate(currentList);
  }, [currentList]);

  if (loading) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="w-full max-w-[560px] mx-auto pb-28 relative select-text"
    >
      {/* 07｜去管理化時間線頂部導航 */}
      <header className="sticky top-0 bg-canvas/95 backdrop-blur-md py-3 z-20 flex items-center justify-between border-b border-border-base/30 mb-6 select-none">
        {isViewingArchived ? (
          /* 【已收起空間】頂部：< 回去 / 標題 */
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsViewingArchived(false)}
              className="p-1.5 text-ink-muted hover:text-ink transition-colors cursor-pointer rounded-full flex items-center gap-1.5 text-xs sm:text-sm font-light"
            >
              <ArrowLeft size={15} />
              <span>{UI_TEXT.hiddenSpace.backBtn.replace('←', '').trim()}</span>
            </button>
            <span className="text-xs sm:text-sm font-medium text-ink">
              {UI_TEXT.hiddenSpace.title}
            </span>
          </div>
        ) : (
          /* 【正常時間線】頂部：← 回來看看 */
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-ink-muted hover:text-ink transition-colors rounded-full cursor-pointer flex items-center gap-2 text-xs sm:text-sm font-light select-none"
            title="返回"
          >
            <ArrowLeft size={15} />
            <span className="text-ink-secondary hover:text-ink">{UI_TEXT.home.reviewBtn}</span>
          </button>
        )}

        {/* 右側 17｜隱形抽屜 (···)：收納「已收起」空間 */}
        {!isViewingArchived && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowDrawerMenu(prev => !prev)}
              className="text-ink-muted/60 hover:text-ink cursor-pointer px-2 py-1 text-sm tracking-widest transition-colors select-none"
              title="選單"
            >
              {UI_TEXT.menu.trigger}
            </button>

            {showDrawerMenu && (
              <>
                <div
                  className="fixed inset-0 z-20"
                  onClick={() => setShowDrawerMenu(false)}
                />
                <div className="absolute right-0 top-full mt-1.5 py-1 px-1 bg-surface border border-border-base/80 rounded-2xl shadow-lg z-30 whitespace-nowrap min-w-[110px] space-y-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setShowDrawerMenu(false);
                      setIsViewingArchived(true);
                    }}
                    className="w-full text-left text-xs text-ink-secondary hover:text-ink hover:bg-surface-hover px-3 py-2 rounded-xl cursor-pointer transition-colors"
                  >
                    {UI_TEXT.menu.hiddenSpaceItem}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </header>

      {/* 07｜自然日期流動排版（帶極淡時間軸微結構與緊湊節奏） */}
      <div className="space-y-10 sm:space-y-12">
        {groupedData.length === 0 ? (
          <div className="py-24 text-center text-ink-muted/60 font-light text-sm">
            {isViewingArchived ? UI_TEXT.hiddenSpace.emptyState : UI_TEXT.review.emptyState}
          </div>
        ) : (
          groupedData.map((group) => (
            <div key={group.dateKey} className="space-y-3.5">
              {/* 日期標題：強化層級（圓點 + 加粗標題） */}
              <div className="flex items-center gap-2 select-none">
                <span className="w-1.5 h-1.5 rounded-full bg-ink/75" />
                <h2 className="text-sm sm:text-[15px] font-semibold text-ink tracking-wide">
                  {group.header}
                </h2>
              </div>

              {/* 極淡垂直時間軸線（串聯零碎思緒，化解死白） */}
              <div className="border-l border-border-base/50 pl-4 sm:pl-5 ml-0.5 space-y-6 sm:space-y-7">
                <AnimatePresence mode="popLayout">
                  {group.threads.map((thread, idx) => (
                    <motion.div
                      key={thread.id}
                      layout
                      variants={itemVariants}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      transition={{ layout: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } }}
                      className={idx < group.threads.length - 1 ? 'pb-5 border-b border-border-base/15' : ''}
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
              </div>
            </div>
          ))
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


