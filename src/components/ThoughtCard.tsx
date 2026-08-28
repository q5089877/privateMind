import React, { useState } from 'react';
import { motion, AnimatePresence, useDragControls } from 'motion/react';
import { Trash2, MoreHorizontal, Footprints, CornerDownLeft } from 'lucide-react';
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
  onLeave?: () => void;
  onAppend: (content: string, type: EntryType) => void;
  onSetCurrentAction?: (entryId: string | null) => void;
}

const formatTimestamp = (timestamp: number) => {
  const d = new Date(timestamp);
  const month = d.getMonth() + 1;
  const date = d.getDate();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${month}/${date} ${hours}:${minutes}`;
};

export const ThoughtCard: React.FC<ThoughtCardProps> = ({ 
  thread, 
  isArchivedView = false,
  onDelete, 
  onArchive,
  onRestore, 
  onAppend,
  onSetCurrentAction
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [isTakingStep, setIsTakingStep] = useState(false);
  const [showEntryPicker, setShowEntryPicker] = useState(false);
  const [activeEntryActionMenu, setActiveEntryActionMenu] = useState<string | null>(null);
  const [dragY, setDragY] = useState(0);
  const [exitDirection, setExitDirection] = useState<'sink' | 'float' | null>(null);
  const longPressTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragControls = useDragControls();

  const handleDeleteConfirm = () => {
    onDelete();
    setShowDeleteConfirm(false);
    setShowMoreMenu(false);
  };

  // 封存儀式：向下沉 (Sink)
  const handleSinkArchive = () => {
    setExitDirection('sink');
    triggerHaptic('settle');
    setTimeout(() => {
      onArchive?.();
      setExitDirection(null);
    }, 450);
  };

  // 還原儀式：浮回來 (Float)
  const handleFloatRestore = () => {
    setExitDirection('float');
    triggerHaptic('step');
    setTimeout(() => {
      onRestore?.();
      setExitDirection(null);
    }, 450);
  };

  // 久按單句偵測
  const handleEntryPointerDown = (entryId: string) => {
    if (isArchivedView) return;
    longPressTimerRef.current = setTimeout(() => {
      triggerHaptic('step');
      setActiveEntryActionMenu(entryId);
    }, 420);
  };

  const handleEntryPointerUpOrLeave = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const currentAction = thread.currentActionId 
    ? thread.entries.find(e => e.id === thread.currentActionId)
    : null;

  const pastEntries = thread.entries.filter(e => e.id !== thread.currentActionId);

  return (
    <div className="relative">
      <motion.div 
        layout
        drag={!isArchivedView && !isAdding && !isTakingStep && !showDeleteConfirm && !showEntryPicker ? "y" : false}
        dragDirectionLock
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0.02, bottom: 0.65 }}
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
        {/* 獨立刪除確認視窗 */}
        <AnimatePresence>
          {showDeleteConfirm && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-30 bg-surface/95 backdrop-blur-xs flex flex-col items-center justify-center space-y-3 px-6 text-center"
            >
              <p className="text-base text-ink font-medium">
                {UI_TEXT.review.card.confirmDeleteTitle}
              </p>
              <p className="text-xs text-ink-muted leading-relaxed">
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
                  className="px-5 py-1.5 text-xs rounded-full bg-red-500/10 text-red-600 hover:bg-red-50/20 transition-colors cursor-pointer font-medium"
                >
                  {UI_TEXT.review.card.deleteBtn}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-5">
          {/* 當前行動顯示：與時間線分開 */}
          {currentAction && (
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs text-ink-muted">
                <span className="font-medium text-ink tracking-wide">{UI_TEXT.review.card.currentActionHeader}</span>
                {onSetCurrentAction && !isArchivedView && (
                  <button 
                    type="button" 
                    onClick={() => onSetCurrentAction(null)}
                    className="text-[11px] text-ink-muted hover:text-ink cursor-pointer"
                  >
                    {UI_TEXT.review.card.clearActionBtn}
                  </button>
                )}
              </div>
              <div className="text-lg font-normal text-ink leading-relaxed">
                {currentAction.content}
              </div>
            </div>
          )}

          {/* 若有當前行動，在過去與現在之間加上分隔線與「過去」標題 */}
          {currentAction && pastEntries.length > 0 && (
            <div className="pt-2 border-t border-border-base/40 space-y-1">
              <span className="text-xs text-ink-muted/80 tracking-wide">{UI_TEXT.review.card.pastTimelineHeader}</span>
            </div>
          )}

          {/* 時間線內容流 (支援久按單句快捷操作) */}
          <div className="space-y-5">
            {(currentAction ? pastEntries : thread.entries).map((entry, index) => (
              <div 
                key={entry.id} 
                className={`space-y-1 relative group select-text ${index > 0 && !currentAction ? 'pt-3 border-t border-border-base/30' : ''}`}
                onPointerDown={() => handleEntryPointerDown(entry.id)}
                onPointerUp={handleEntryPointerUpOrLeave}
                onPointerLeave={handleEntryPointerUpOrLeave}
                onTouchEnd={handleEntryPointerUpOrLeave}
              >
                <div className="text-base sm:text-lg font-light leading-relaxed whitespace-pre-wrap text-ink">
                  {entry.content}
                </div>
                <div className="text-xs text-ink-muted/70 font-mono select-none flex justify-between items-center">
                  <span>{formatTimestamp(entry.createdAt)}</span>
                  {!isArchivedView && onSetCurrentAction && (
                    <span className="text-[10px] text-ink-muted/40 opacity-0 group-hover:opacity-100 transition-opacity">
                      （久按設為行動）
                    </span>
                  )}
                </div>

                {/* 久按單句浮現快捷泡泡 */}
                <AnimatePresence>
                  {activeEntryActionMenu === entry.id && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9, y: 5 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="absolute right-0 top-0 z-20 bg-surface border border-border-focus rounded-xl shadow-md p-1.5 flex items-center gap-2"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          onSetCurrentAction?.(entry.id);
                          setActiveEntryActionMenu(null);
                        }}
                        className="px-3 py-1 bg-accent text-accent-text rounded-lg text-xs font-normal cursor-pointer hover:bg-accent-hover active:scale-98"
                      >
                        {UI_TEXT.review.card.setActionBtn}
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveEntryActionMenu(null)}
                        className="px-2 py-1 text-ink-muted hover:text-ink text-xs cursor-pointer"
                      >
                        關閉
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>

          {/* ＋ 接著說…… 輸入區 */}
          {isAdding && (
            <AdditionForm 
              mode="append"
              onSave={(content, type) => {
                onAppend(content, type);
                setIsAdding(false);
              }}
              onCancel={() => setIsAdding(false)}
            />
          )}

          {/* 寫下一小步 輸入區 */}
          {isTakingStep && (
            <AdditionForm 
              mode="action_step"
              onSave={(content, type) => {
                onAppend(content, type);
                setIsTakingStep(false);
              }}
              onCancel={() => setIsTakingStep(false)}
            />
          )}

          {/* 設為當前行動：選擇現有文字 */}
          {showEntryPicker && (
            <div className="mt-3 p-4 rounded-2xl border border-border-base bg-surface-subtle space-y-3">
              <div className="flex justify-between items-center text-xs text-ink-muted">
                <span>選擇哪一句成為當前行動：</span>
                <button 
                  type="button" 
                  onClick={() => setShowEntryPicker(false)}
                  className="text-ink-muted hover:text-ink"
                >
                  取消
                </button>
              </div>
              <div className="space-y-2">
                {thread.entries.map((e) => (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => {
                      onSetCurrentAction?.(e.id);
                      setShowEntryPicker(false);
                    }}
                    className={`w-full text-left p-2.5 rounded-xl border text-sm transition-all cursor-pointer ${
                      thread.currentActionId === e.id
                        ? 'bg-surface border-border-focus text-ink font-medium'
                        : 'bg-surface/50 border-border-base/50 text-ink-secondary hover:text-ink hover:bg-surface'
                    }`}
                  >
                    {e.content}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 底部操作區 */}
        {!isAdding && !isTakingStep && !showEntryPicker && (
          <div className="pt-4 mt-4 border-t border-border-base/50 space-y-3">
            {isArchivedView ? (
              /* 已封存視圖操作：還原 + 更多 (刪除) */
              <div className="flex items-center justify-between gap-2">
                <button 
                  type="button"
                  onClick={handleFloatRestore}
                  className="flex items-center gap-1.5 text-xs sm:text-sm text-ink-secondary hover:text-ink transition-colors cursor-pointer py-1.5 px-4 rounded-xl bg-surface-subtle hover:bg-surface-hover border border-border-base/60 active:scale-98"
                >
                  <CornerDownLeft size={14} />
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
              /* 正在時間線視圖操作：＋ 接著說…… (最主要) + 帶走一小步 / 封存 / 更多選單 */
              <>
                <button 
                  type="button"
                  onClick={() => setIsAdding(true)}
                  className="w-full py-2 px-4 rounded-xl bg-surface-subtle hover:bg-surface-hover border border-border-base/60 text-ink text-sm font-normal tracking-wide transition-all cursor-pointer active:scale-[0.99] text-center"
                >
                  {UI_TEXT.review.card.addAdditionBtn}
                </button>

                <div className="flex items-center justify-between pt-0.5">
                  <div className="flex items-center gap-2">
                    {/* 帶走一小步 */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setIsTakingStep(true)}
                        className="flex items-center gap-1 text-xs text-ink-secondary hover:text-ink cursor-pointer py-1 px-2.5 rounded-lg bg-surface-subtle hover:bg-surface-hover border border-border-base/40 transition-colors active:scale-98"
                      >
                        <Footprints size={13} />
                        <span>{UI_TEXT.review.card.takeStepBtn}</span>
                      </button>
                    </div>

                    {/* 封存 */}
                    <button 
                      type="button"
                      onPointerDown={(e) => {
                        dragControls.start(e);
                      }}
                      onClick={handleSinkArchive} 
                      className="touch-none flex items-center gap-1 text-xs text-ink-muted hover:text-ink cursor-grab active:cursor-grabbing py-1 px-2.5 rounded-lg bg-surface-subtle hover:bg-surface-hover border border-border-base/40 transition-colors active:scale-98 select-none"
                      title="向下拖曳或點擊以封存"
                    >
                      <span>{UI_TEXT.review.card.archiveBtn}</span>
                      <span className="text-[10px] text-ink-muted/50 font-light">（下拉）</span>
                    </button>
                  </div>

                  {/* 更多 (⋯) → 設為當前行動 / 刪除 */}
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
                      <div className="absolute right-0 bottom-full mb-1 py-1 px-1 bg-surface border border-border-base rounded-lg shadow-md z-20 whitespace-nowrap min-w-[120px]">
                        {thread.entries.length > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              setShowMoreMenu(false);
                              setShowEntryPicker(true);
                            }}
                            className="w-full flex items-center gap-1.5 text-xs text-ink-secondary hover:text-ink hover:bg-surface-hover px-2.5 py-1.5 rounded-md cursor-pointer transition-colors text-left"
                          >
                            <span>{UI_TEXT.review.card.setActionBtn}</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setShowMoreMenu(false);
                            setShowDeleteConfirm(true);
                          }}
                          className="w-full flex items-center gap-1.5 text-xs text-red-500 hover:bg-red-50/50 px-2.5 py-1.5 rounded-md cursor-pointer transition-colors text-left"
                        >
                          <Trash2 size={12} />
                          <span>{UI_TEXT.review.card.deleteBtn}</span>
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

      {/* 拖拉底層引導區 */}
      {!isArchivedView && (
        <div 
          className={`absolute inset-x-0 -bottom-3 flex items-center justify-center pointer-events-none transition-opacity duration-200 ${
            dragY > 15 ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <div className="flex items-center gap-1.5 text-xs text-ink-muted bg-surface/90 backdrop-blur-xs px-3 py-1 rounded-full border border-border-base/60 shadow-xs">
            <span className={dragY > 85 ? 'text-ink font-medium' : 'text-ink-muted'}>
              {dragY > 85 ? '鬆手封存' : UI_TEXT.review.card.archiveDragHint}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};



