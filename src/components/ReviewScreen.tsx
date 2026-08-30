import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft } from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';
import { ThoughtCard } from './ThoughtCard';
import { useThoughts } from '../hooks/useThoughts';
import { UI_TEXT } from '../config/textConfig';
import { groupThreadsByDate } from '../utils/dateUtils';

const itemVariants = {
  initial: { opacity: 0, y: 16 },
  animate: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: Math.min((i || 0) * 0.08, 0.7),
      duration: 0.7,
      ease: [0.16, 1, 0.3, 1]
    }
  }),
  exit: {
    opacity: 0,
    y: 8,
    transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] }
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
    handleDelete, handleArchive, handleRestore, handleAppend, handleEdit
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
      className="w-full max-w-[672px] mx-auto pb-28 relative select-text"
    >
      <header className="sticky top-0 bg-transparent backdrop-blur-sm py-3 z-20 mb-4 select-none px-1">
        {isViewingArchived ? (
          /* 【已收起空間】三欄：左返回 / 中標題 / 右空白 */
          <div className="grid grid-cols-3 items-center w-full">
            <button
              type="button"
              onClick={() => setIsViewingArchived(false)}
              className="p-1.5 text-ink-muted hover:text-ink transition-colors cursor-pointer rounded-full flex items-center gap-1.5 text-xs sm:text-sm font-light justify-self-start"
            >
              <ArrowLeft size={15} />
              <span>{UI_TEXT.hiddenSpace.backBtn.replace('←', '').trim()}</span>
            </button>
            <span className="text-xs sm:text-sm font-medium text-ink text-center justify-self-center">
              {UI_TEXT.hiddenSpace.title}
            </span>
            <div />
          </div>
        ) : (
          /* 【正常時間線】左返回 / 右已收起 */
          <div className="flex items-center justify-between w-full">
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-ink-muted hover:text-ink transition-colors rounded-full cursor-pointer flex items-center gap-1.5 text-xs sm:text-sm font-light select-none"
              title={UI_TEXT.review.backHome}
            >
              <ArrowLeft size={15} />
              <span className="text-ink-secondary hover:text-ink">{UI_TEXT.review.backHome}</span>
            </button>
            <button
              type="button"
              onClick={() => setIsViewingArchived(true)}
              className="px-3 py-1 text-xs font-normal text-ink-secondary hover:text-ink border border-border-base hover:border-border-focus rounded-full bg-transparent transition-colors cursor-pointer active:scale-[0.98]"
            >
              {UI_TEXT.hiddenSpace.title}
            </button>
          </div>
        )}
      </header>

      {/* 頁面標題：定向錨點，非 sticky，僅正常時間線顯示 */}
      {!isViewingArchived && (
        <div className="mb-5 select-none">
          <h1 className="text-lg font-medium text-ink tracking-tight">思緒紀錄</h1>
        </div>
      )}

      {/* 07｜自然日期流動排版（帶極淡時間軸微結構與緊湊節奏） */}
      <div className="space-y-7 sm:space-y-8">
        {groupedData.length === 0 ? (
          <div className="py-24 text-center text-ink-muted font-light text-sm">
            {isViewingArchived ? UI_TEXT.hiddenSpace.emptyState : UI_TEXT.review.emptyState}
          </div>
        ) : (
          (() => {
            let globalCount = 0;
            return groupedData.map((group) => (
              <div key={group.dateKey} className="space-y-2.5">
                {/* 日期標題：強化層級（圓點 + 加粗標題） */}
                <div className="flex items-center gap-2 select-none pb-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-ink" />
                  <h2 className="text-xs sm:text-sm font-semibold text-ink tracking-wide">
                    {group.header}
                  </h2>
                </div>

                {/* 極淡垂直時間軸線（串聯零碎思緒，緊湊排版） */}
                <div className="border-l border-border-base pl-3.5 sm:pl-4 ml-0.5 space-y-2">
                  <AnimatePresence mode="popLayout">
                    {group.threads.map((thread, idx) => {
                      const itemIdx = globalCount++;
                      return (
                        <motion.div
                          key={thread.id}
                          layout
                          custom={itemIdx}
                          variants={itemVariants}
                          initial="initial"
                          animate="animate"
                          exit="exit"
                          transition={{ layout: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } }}
                          className={idx < group.threads.length - 1 ? 'pb-2.5 border-b border-border-subtle' : ''}
                        >
                          <ThoughtCard
                            thread={thread}
                            isArchivedView={isViewingArchived}
                            onDelete={() => onDeleteClick(thread.id)}
                            onArchive={() => onArchiveClick(thread.id)}
                            onRestore={() => onRestoreClick(thread.id)}
                            onAppend={(content, type) => handleAppend(thread.id, content, type)}
                            onEdit={(entryId, content) => handleEdit(thread.id, entryId, content)}
                          />
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </div>
            ));
          })()
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


