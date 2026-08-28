import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trash2, MoreHorizontal, CornerDownLeft, ChevronDown, Archive, Target, X } from 'lucide-react';
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
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [isSettingAction, setIsSettingAction] = useState(false);
  const [exitDirection, setExitDirection] = useState<'sink' | 'float' | null>(null);

  const cardLongPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);

  const handleDeleteConfirm = () => {
    onDelete();
    setShowDeleteConfirm(false);
    setShowMoreMenu(false);
  };

  // 封存儀式：向下沉 (Sink)
  const handleSinkArchive = () => {
    setShowMoreMenu(false);
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

  // 卡片級別久按：收合 / 展開開關
  const handleCardPointerDown = (e: React.PointerEvent) => {
    touchStartPosRef.current = { x: e.clientX, y: e.clientY };
    cardLongPressTimerRef.current = setTimeout(() => {
      triggerHaptic('step');
      setIsCollapsed(prev => !prev);
    }, 480);
  };

  const handleCardPointerMove = (e: React.PointerEvent) => {
    if (!touchStartPosRef.current || !cardLongPressTimerRef.current) return;
    const dist = Math.hypot(e.clientX - touchStartPosRef.current.x, e.clientY - touchStartPosRef.current.y);
    if (dist > 10) {
      if (cardLongPressTimerRef.current) {
        clearTimeout(cardLongPressTimerRef.current);
        cardLongPressTimerRef.current = null;
      }
    }
  };

  const handleCardPointerUpOrLeave = () => {
    if (cardLongPressTimerRef.current) {
      clearTimeout(cardLongPressTimerRef.current);
      cardLongPressTimerRef.current = null;
    }
    touchStartPosRef.current = null;
  };

  const currentAction = thread.currentActionId 
    ? thread.entries.find(e => e.id === thread.currentActionId)
    : null;

  const pastEntries = thread.entries.filter(e => e.id !== thread.currentActionId);
  const firstEntry = thread.entries[0];

  return (
    <div className="relative">
      <motion.div 
        layout
        onPointerDown={handleCardPointerDown}
        onPointerMove={handleCardPointerMove}
        onPointerUp={handleCardPointerUpOrLeave}
        onPointerLeave={handleCardPointerUpOrLeave}
        onTouchEnd={handleCardPointerUpOrLeave}
        animate={
          exitDirection === 'sink'
            ? { y: 70, opacity: 0, scale: 0.95, filter: 'blur(3px)' }
            : exitDirection === 'float'
            ? { y: -70, opacity: 0, scale: 0.95, filter: 'blur(3px)' }
            : { y: 0, opacity: 1, scale: 1 }
        }
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className={`rounded-2xl border bg-surface border-border-base shadow-xs relative overflow-hidden transition-all duration-300 select-text ${
          isCollapsed ? 'p-4 sm:p-5 cursor-pointer bg-surface-subtle/70' : 'p-6 sm:p-7'
        }`}
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

        {/* 收合狀態（Collapsed View） */}
        {isCollapsed ? (
          <div 
            className="flex items-center justify-between gap-3 select-none"
            onClick={() => setIsCollapsed(false)}
          >
            <div className="flex-grow min-w-0">
              {currentAction ? (
                <div className="flex items-baseline gap-2">
                  <span className="text-xs text-ink-muted font-medium tracking-wide shrink-0">
                    {UI_TEXT.review.card.currentActionHeader}
                  </span>
                  <p className="text-base font-normal text-ink truncate">
                    {currentAction.content}
                  </p>
                </div>
              ) : (
                <p className="text-base font-light text-ink truncate">
                  {firstEntry?.content || ''}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0 text-ink-muted">
              <span className="text-xs font-mono">
                {thread.entries.length > 1 ? `${thread.entries.length} 則` : formatTimestamp(thread.updatedAt || thread.createdAt)}
              </span>
              <ChevronDown size={15} className="text-ink-muted/60" />
            </div>
          </div>
        ) : (
          /* 展開狀態（Expanded View） */
          <div className="space-y-6">
            {/* 當前行動：整條 Thread 的唯一現在方向 */}
            {currentAction && (
              <div className="space-y-2 pb-4 border-b border-border-base/40">
                <div className="flex justify-between items-center text-xs text-ink-muted">
                  <span className="font-normal text-ink-muted tracking-wide">{UI_TEXT.review.card.currentActionHeader}</span>
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
                <div className="text-base sm:text-lg font-normal text-ink leading-relaxed">
                  {currentAction.content}
                </div>
              </div>
            )}

            {/* 時間線思緒節點流（思緒為主，時間弱化置頂，無聊天氣泡） */}
            <div className="space-y-6 pt-1">
              {(currentAction ? pastEntries : thread.entries).map((entry) => (
                <div key={entry.id} className="space-y-1.5">
                  <div className="text-xs text-ink-muted/50 font-mono select-none tracking-wider">
                    {formatTimestamp(entry.createdAt)}
                  </div>
                  <div className="text-base sm:text-lg font-light leading-relaxed whitespace-pre-wrap text-ink">
                    {entry.content}
                  </div>
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

            {/* 設為當前行動 輸入 / 選擇區 */}
            {isSettingAction && (
              <div className="mt-4 p-4 rounded-2xl border border-border-base bg-surface-subtle space-y-4">
                <div className="flex justify-between items-center text-xs text-ink-muted">
                  <span>{UI_TEXT.review.card.setActionBtn}</span>
                  <button 
                    type="button" 
                    onClick={() => setIsSettingAction(false)}
                    className="text-ink-muted hover:text-ink cursor-pointer p-1"
                  >
                    <X size={14} />
                  </button>
                </div>

                {/* 輸入新的一小步 */}
                <AdditionForm 
                  mode="action_step"
                  placeholder={UI_TEXT.review.card.actionPrompt}
                  submitText={UI_TEXT.review.card.becomeActionBtn}
                  onSave={(content, type) => {
                    onAppend(content, type);
                    setIsSettingAction(false);
                  }}
                  onCancel={() => setIsSettingAction(false)}
                />

                {/* 或從現有思緒中選取 */}
                {thread.entries.length > 0 && (
                  <div className="pt-2 border-t border-border-base/30 space-y-2">
                    <span className="text-[11px] text-ink-muted">或直接選取現有的一筆：</span>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {thread.entries.map((e) => (
                        <button
                          key={e.id}
                          type="button"
                          onClick={() => {
                            onSetCurrentAction?.(e.id);
                            setIsSettingAction(false);
                          }}
                          className={`w-full text-left p-2.5 rounded-xl border text-xs sm:text-sm transition-all cursor-pointer ${
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
            )}
          </div>
        )}

        {/* 底部階層化操作區（僅展開時顯示） */}
        {!isCollapsed && !isAdding && !isSettingAction && (
          <div className="pt-5 mt-6 border-t border-border-base/40 flex flex-col items-center gap-3">
            {isArchivedView ? (
              /* 已封存視圖操作：還原 + 更多 (刪除) */
              <div className="w-full flex items-center justify-between">
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
                    className="p-2 text-ink-muted/40 hover:text-red-500 cursor-pointer rounded-lg hover:bg-red-50/40 transition-colors"
                    title="刪除"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ) : (
              /* 正在時間線視圖：＋ 接著說…… (唯一主要操作) + ⋯ (次要操作) */
              <>
                <button 
                  type="button"
                  onClick={() => setIsAdding(true)}
                  className="w-full py-2.5 px-5 rounded-full bg-surface-subtle hover:bg-surface-hover border border-border-base/70 text-ink text-sm sm:text-base font-normal tracking-wide transition-all cursor-pointer active:scale-[0.99] text-center"
                >
                  {UI_TEXT.review.card.addAdditionBtn}
                </button>

                {/* ⋯ 更多次要選單 */}
                <div className="relative self-end pt-1">
                  <button 
                    type="button"
                    onClick={() => setShowMoreMenu(!showMoreMenu)}
                    className="flex items-center gap-1 text-xs text-ink-muted/50 hover:text-ink cursor-pointer px-2 py-1 rounded-lg hover:bg-surface-subtle transition-colors"
                    title="更多選項"
                  >
                    <MoreHorizontal size={16} />
                  </button>

                  {showMoreMenu && (
                    <div className="absolute right-0 bottom-full mb-2 py-1.5 px-1 bg-surface border border-border-base rounded-xl shadow-lg z-20 whitespace-nowrap min-w-[130px] space-y-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          setShowMoreMenu(false);
                          setIsSettingAction(true);
                        }}
                        className="w-full flex items-center gap-2 text-xs text-ink-secondary hover:text-ink hover:bg-surface-hover px-3 py-2 rounded-lg cursor-pointer transition-colors text-left"
                      >
                        <Target size={13} />
                        <span>{UI_TEXT.review.card.setActionBtn}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleSinkArchive}
                        className="w-full flex items-center gap-2 text-xs text-ink-secondary hover:text-ink hover:bg-surface-hover px-3 py-2 rounded-lg cursor-pointer transition-colors text-left"
                      >
                        <Archive size={13} />
                        <span>{UI_TEXT.review.card.archiveBtn}</span>
                      </button>

                      <div className="border-t border-border-base/40 my-1" />

                      <button
                        type="button"
                        onClick={() => {
                          setShowMoreMenu(false);
                          setShowDeleteConfirm(true);
                        }}
                        className="w-full flex items-center gap-2 text-xs text-red-500 hover:bg-red-50/50 px-3 py-2 rounded-lg cursor-pointer transition-colors text-left"
                      >
                        <Trash2 size={13} />
                        <span>{UI_TEXT.review.card.deleteBtn}</span>
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
};
