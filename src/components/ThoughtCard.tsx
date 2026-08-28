import React, { useState } from 'react';
import { motion, AnimatePresence, useDragControls } from 'motion/react';
import { Leaf, Trash2, ArrowUp, MoreHorizontal } from 'lucide-react';
import { ThoughtThread, EntryType } from '../types';
import { UI_TEXT } from '../config/textConfig';
import { triggerHaptic } from '../utils/haptics';
import { AdditionForm } from './AdditionForm';

interface ThoughtCardProps {
  thread: ThoughtThread;
  isArchivedView?: boolean;
  onDelete: () => void;
  onArchive?: () => void;
  onRestore?: () => void;
  onLeave: () => void;
  onAppend: (content: string, type: EntryType) => void;
  onSetCurrentAction?: (entryId: string | null) => void;
}

export const ThoughtCard: React.FC<ThoughtCardProps> = ({ 
  thread, 
  isArchivedView = false,
  onDelete, 
  onArchive,
  onRestore,
  onLeave, 
  onAppend,
  onSetCurrentAction
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [exitDirection, setExitDirection] = useState<'sink' | 'float' | null>(null);
  const dragControls = useDragControls();

  const handleDeleteConfirm = () => {
    onDelete();
    setShowDeleteConfirm(false);
    setShowMoreMenu(false);
  };

  // 封存儀式：慢慢沉下去 (Sink)
  const handleSinkArchive = () => {
    setExitDirection('sink');
    triggerHaptic('settle');
    setTimeout(() => {
      onArchive?.();
      setExitDirection(null);
    }, 450);
  };

  // 還原儀式：慢慢浮回來 (Float)
  const handleFloatRestore = () => {
    setExitDirection('float');
    triggerHaptic('step');
    setTimeout(() => {
      onRestore?.();
      setExitDirection(null);
    }, 450);
  };

  const currentAction = thread.currentActionId 
    ? thread.entries.find(e => e.id === thread.currentActionId)
    : null;

  return (
    <div className="relative">
      <motion.div 
        layout
        drag={!isArchivedView && !isAdding && !showDeleteConfirm ? "y" : false}
        dragControls={dragControls}
        dragListener={false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0.05, bottom: 0.7 }}
        onDrag={(_, info) => {
          if (info.offset.y > 0) {
            setDragY(info.offset.y);
          }
        }}
        onDragEnd={(_, info) => {
          if (info.offset.y > 80) {
            handleSinkArchive();
          } else {
            setDragY(0);
          }
        }}
        animate={
          exitDirection === 'sink'
            ? { y: 70, opacity: 0, scale: 0.95, filter: 'blur(3px)' }
            : exitDirection === 'float'
            ? { y: -70, opacity: 0, scale: 0.95, filter: 'blur(3px)' }
            : { y: 0, opacity: Math.max(1 - dragY / 300, 0.45), scale: Math.max(1 - dragY / 1200, 0.96) }
        }
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="p-6 sm:p-7 rounded-2xl border bg-surface border-border-base shadow-xs relative overflow-hidden touch-pan-y"
      >
      {/* 獨立刪除確認 Modal (非不可逆提示) */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-30 bg-surface/95 backdrop-blur-xs flex flex-col items-center justify-center space-y-3 px-6 text-center"
          >
            <p className="text-base text-ink font-light">
              {UI_TEXT.review.card.confirmDeleteTitle}
            </p>
            <p className="text-xs text-ink-muted">
              {UI_TEXT.review.card.confirmDeleteSubtext}
            </p>
            <div className="flex gap-4 pt-2">
              <button 
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-5 py-1.5 text-xs rounded-full bg-surface-muted text-ink-secondary hover:text-ink transition-colors cursor-pointer"
              >
                {UI_TEXT.review.card.keepBtn}
              </button>
              <button 
                type="button"
                onClick={handleDeleteConfirm}
                className="px-5 py-1.5 text-xs rounded-full bg-red-500/10 text-red-600 hover:bg-red-500/20 transition-colors cursor-pointer font-medium"
              >
                {UI_TEXT.review.card.deleteBtn}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex justify-between items-start gap-4">
        <div className="space-y-4 flex-grow">
          {/* 當前行動：唯一有效版本獨立置頂 */}
          {currentAction && (
            <div className="p-4 rounded-xl bg-surface-subtle/80 border border-border-base/70 space-y-1">
              <div className="flex justify-between items-center text-xs text-ink-muted">
                <span>目前行動</span>
                {onSetCurrentAction && !isArchivedView && (
                  <button 
                    type="button" 
                    onClick={() => onSetCurrentAction(null)}
                    className="text-[11px] text-ink-muted hover:text-ink cursor-pointer"
                  >
                    清除
                  </button>
                )}
              </div>
              <div className="text-base sm:text-lg font-normal text-ink leading-relaxed">
                → {currentAction.content}
              </div>
            </div>
          )}

          {/* 時間線內容流（文字為主角，時間弱化，無多餘 UI 標籤） */}
          <div className="space-y-4 pt-1">
            {thread.entries.map((entry, index) => {
              const prevEntry = index > 0 ? thread.entries[index - 1] : null;
              const currentDateStr = new Date(entry.createdAt).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' });
              const prevDateStr = prevEntry ? new Date(prevEntry.createdAt).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' }) : null;
              const showFullDate = index === 0 || currentDateStr !== prevDateStr;

              return (
                <div key={entry.id} className="space-y-1">
                  <div className="text-xs text-ink-muted/70 font-mono select-none">
                    {showFullDate
                      ? new Date(entry.createdAt).toLocaleString('zh-TW', {
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true
                        })
                      : new Date(entry.createdAt).toLocaleString('zh-TW', {
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true
                        })}
                  </div>

                  <div className="text-base sm:text-lg font-light leading-relaxed whitespace-pre-wrap text-ink">
                    {entry.content}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ＋ 接著說…… / 展開輸入 */}
          {isAdding && (
            <div className="pt-2">
              <AdditionForm 
                onSave={(content, type) => {
                  onAppend(content, type);
                  setIsAdding(false);
                }}
                onCancel={() => setIsAdding(false)}
              />
            </div>
          )}
        </div>
      </div>

      {/* 底部階層化操作區 */}
      {!isAdding && (
        <div className="pt-4 mt-4 border-t border-border-base/50 space-y-3">
          {isArchivedView ? (
            /* 已封存視圖操作：帶回來 (主操作) + 更多 (刪除) */
            <div className="flex items-center justify-between gap-2">
              <button 
                type="button"
                onClick={handleFloatRestore}
                className="flex items-center gap-1.5 text-xs sm:text-sm text-ink-secondary hover:text-ink transition-colors cursor-pointer py-1.5 px-3.5 rounded-xl bg-surface-subtle hover:bg-surface-hover border border-border-base/60 active:scale-98"
              >
                <ArrowUp size={14} />
                <span>{UI_TEXT.review.card.restoreBtn}</span>
              </button>

              <div className="relative">
                <button 
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center gap-1 text-[11px] text-ink-muted/40 hover:text-red-500 cursor-pointer py-1.5 px-2.5 rounded-lg hover:bg-red-50/40 transition-colors"
                  title="刪除"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ) : (
            /* 正在這裡的視圖操作：＋ 接著說…… (主操作) + 封存 (次操作) + 更多選單 (刪除) */
            <>
              <button 
                type="button"
                onClick={() => setIsAdding(true)}
                className="w-full py-2 px-4 rounded-xl bg-surface-subtle hover:bg-surface-hover border border-border-base/60 text-ink hover:text-ink text-sm font-normal tracking-wide transition-all cursor-pointer active:scale-[0.99] text-center"
              >
                {UI_TEXT.addition.addBtn}
              </button>

              <div className="flex items-center justify-between pt-0.5">
                <button 
                  type="button"
                  onPointerDown={(e) => {
                    dragControls.start(e);
                  }}
                  onClick={handleSinkArchive} 
                  className="touch-none flex items-center gap-1.5 text-xs text-ink-muted hover:text-ink cursor-grab active:cursor-grabbing py-1 px-2.5 rounded-lg bg-surface-subtle hover:bg-surface-hover border border-border-base/40 transition-colors active:scale-98 select-none"
                  title="按住往下拉封存，或直接點擊"
                >
                  <Leaf size={14} className="text-ink-muted" />
                  <span>{UI_TEXT.review.card.archiveBtn}</span>
                  <span className="text-[10px] text-ink-muted/50 font-light">（按住下拉）</span>
                </button>

                {/* 更多 (⋯) → 刪除 */}
                <div className="relative">
                  <button 
                    type="button"
                    onClick={() => setShowMoreMenu(!showMoreMenu)}
                    className="p-1 text-ink-muted/40 hover:text-ink cursor-pointer rounded-lg hover:bg-surface-subtle transition-colors"
                    title="更多"
                  >
                    <MoreHorizontal size={15} />
                  </button>

                  {showMoreMenu && (
                    <div className="absolute right-0 bottom-full mb-1 py-1 px-1 bg-surface border border-border-base rounded-lg shadow-md z-20 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => {
                          setShowMoreMenu(false);
                          setShowDeleteConfirm(true);
                        }}
                        className="flex items-center gap-1.5 text-xs text-red-500 hover:bg-red-50/50 px-2.5 py-1 rounded-md cursor-pointer transition-colors"
                      >
                        <Trash2 size={12} />
                        <span>刪除紀錄</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </motion.div>

    {/* 拖拉底層引導區：安靜浮現 */}
    {!isArchivedView && (
      <div 
        className={`absolute inset-x-0 -bottom-3 flex items-center justify-center pointer-events-none transition-opacity duration-200 ${
          dragY > 15 ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="flex items-center gap-1.5 text-xs text-ink-muted bg-surface/90 backdrop-blur-xs px-3 py-1 rounded-full border border-border-base/60 shadow-xs">
          <Leaf size={13} className={dragY > 85 ? 'text-accent' : 'text-ink-muted'} />
          <span className={dragY > 85 ? 'text-ink font-medium' : 'text-ink-muted'}>
            {dragY > 85 ? '鬆手封存' : '輕輕往下拉……'}
          </span>
        </div>
      </div>
    )}
  </div>
  );
};


