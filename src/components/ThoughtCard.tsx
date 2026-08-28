import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, Target, Archive, X } from 'lucide-react';
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
  // 預設收合以保持版面清爽
  const [isCollapsed, setIsCollapsed] = useState(false);
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
  };

  // 封存儀式：向下沉
  const handleSinkArchive = () => {
    setShowMoreMenu(false);
    setExitDirection('sink');
    triggerHaptic('settle');
    setTimeout(() => {
      onArchive?.();
      setExitDirection(null);
    }, 380);
  };

  // 還原儀式：浮回來
  const handleFloatRestore = () => {
    setExitDirection('float');
    triggerHaptic('step');
    setTimeout(() => {
      onRestore?.();
      setExitDirection(null);
    }, 380);
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
            ? { y: 40, opacity: 0, scale: 0.98, filter: 'blur(2px)' }
            : exitDirection === 'float'
            ? { y: -40, opacity: 0, scale: 0.98, filter: 'blur(2px)' }
            : { y: 0, opacity: 1, scale: 1 }
        }
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="relative transition-all duration-300 select-text"
      >
        {/* 刪除二度確認 Modal（僅封存區觸發） */}
        <AnimatePresence>
          {showDeleteConfirm && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-ink/30 backdrop-blur-xs flex items-center justify-center p-6"
            >
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-surface rounded-2xl border border-border-base p-6 max-w-xs w-full shadow-lg text-center space-y-4"
              >
                <div className="space-y-1.5">
                  <p className="text-base text-ink font-medium">
                    {UI_TEXT.review.card.confirmDeleteTitle}
                  </p>
                  <p className="text-xs text-ink-muted leading-relaxed">
                    {UI_TEXT.review.card.confirmDeleteSubtext}
                  </p>
                </div>
                <div className="flex justify-center gap-3 pt-1">
                  <button 
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-4 py-1.5 text-xs rounded-full bg-surface-muted text-ink-secondary hover:text-ink transition-colors cursor-pointer"
                  >
                    {UI_TEXT.review.card.keepBtn}
                  </button>
                  <button 
                    type="button"
                    onClick={handleDeleteConfirm}
                    className="px-4 py-1.5 text-xs rounded-full bg-red-500/10 text-red-600 hover:bg-red-500/20 transition-colors cursor-pointer font-medium"
                  >
                    {UI_TEXT.review.card.deleteBtn}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 收合狀態（Collapsed View） */}
        {isCollapsed ? (
          <div 
            className="flex items-center justify-between gap-3 py-2 cursor-pointer select-none group"
            onClick={() => setIsCollapsed(false)}
          >
            <div className="flex-grow min-w-0">
              {currentAction ? (
                <div className="flex items-baseline gap-2">
                  <span className="text-xs text-ink-muted font-normal shrink-0">
                    {UI_TEXT.review.card.currentActionHeader}
                  </span>
                  <p className="text-sm sm:text-base font-light text-ink truncate">
                    {currentAction.content}
                  </p>
                </div>
              ) : (
                <p className="text-sm sm:text-base font-light text-ink truncate">
                  {firstEntry?.content || ''}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0 text-ink-muted/60 group-hover:text-ink transition-colors">
              <span className="text-xs font-mono">
                {thread.entries.length > 1 ? `${thread.entries.length} 則` : formatTimestamp(thread.updatedAt || thread.createdAt)}
              </span>
              <ChevronDown size={14} />
            </div>
          </div>
        ) : (
          /* 展開狀態（去卡片化純文字排版） */
          <div className="space-y-6">
            {/* 當前行動：現在往這裡 */}
            {currentAction && (
              <div className="space-y-1.5 pb-3 border-b border-border-base/30">
                <div className="flex justify-between items-center text-xs text-ink-muted/70">
                  <span>{UI_TEXT.review.card.currentActionHeader}</span>
                  {onSetCurrentAction && !isArchivedView && (
                    <button 
                      type="button" 
                      onClick={() => onSetCurrentAction(null)}
                      className="text-[11px] text-ink-muted/50 hover:text-ink cursor-pointer"
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

            {/* 時間線思緒節點流（純文字流動排版） */}
            <div className="space-y-6">
              {(currentAction ? pastEntries : thread.entries).map((entry) => (
                <div key={entry.id} className="space-y-1.5">
                  <div className="text-xs text-ink-muted/40 font-mono select-none tracking-wider">
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
              <div className="pt-2">
                <AdditionForm 
                  mode="append"
                  onSave={(content, type) => {
                    onAppend(content, type);
                    setIsAdding(false);
                  }}
                  onCancel={() => setIsAdding(false)}
                />
              </div>
            )}

            {/* 帶走一小步（設為當前行動）輸入 / 選取區 */}
            {isSettingAction && (
              <div className="mt-4 p-4 rounded-xl border border-border-base/50 bg-surface-subtle/50 space-y-4">
                <div className="flex justify-between items-center text-xs text-ink-muted">
                  <span>{UI_TEXT.review.card.takeStepBtn}</span>
                  <button 
                    type="button" 
                    onClick={() => setIsSettingAction(false)}
                    className="text-ink-muted hover:text-ink cursor-pointer p-1"
                  >
                    <X size={14} />
                  </button>
                </div>

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

                {thread.entries.length > 0 && (
                  <div className="pt-2 border-t border-border-base/30 space-y-2">
                    <span className="text-[11px] text-ink-muted/70">或直接選取現有的一筆：</span>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {thread.entries.map((e) => (
                        <button
                          key={e.id}
                          type="button"
                          onClick={() => {
                            onSetCurrentAction?.(e.id);
                            setIsSettingAction(false);
                          }}
                          className={`w-full text-left p-2 rounded-lg border text-xs transition-all cursor-pointer ${
                            thread.currentActionId === e.id
                              ? 'bg-surface border-border-focus text-ink font-medium'
                              : 'bg-surface/40 border-border-base/40 text-ink-secondary hover:text-ink hover:bg-surface'
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

            {/* 底部弱化操作列 */}
            {!isAdding && !isSettingAction && (
              <div className="pt-3 flex items-center justify-between">
                {isArchivedView ? (
                  /* 封存區雙出口：純文字 [ 還原 ] 與 [ 刪除 ] */
                  <div className="flex items-center gap-4 text-xs">
                    <button 
                      type="button"
                      onClick={handleFloatRestore}
                      className="text-ink-secondary hover:text-ink transition-colors cursor-pointer py-1"
                    >
                      {UI_TEXT.review.card.restoreBtn}
                    </button>
                    <span className="text-border-base">·</span>
                    <button 
                      type="button"
                      onClick={() => setShowDeleteConfirm(true)}
                      className="text-red-500/70 hover:text-red-600 transition-colors cursor-pointer py-1"
                    >
                      {UI_TEXT.review.card.deleteBtn}
                    </button>
                  </div>
                ) : (
                  /* 主要時間線：弱化文字連結 [ ＋ 接著說…… ] 與右側 [ ··· ] 隱藏選單 */
                  <>
                    <button 
                      type="button"
                      onClick={() => setIsAdding(true)}
                      className="text-xs sm:text-sm text-ink-muted hover:text-ink font-light tracking-wide transition-colors py-1 cursor-pointer"
                    >
                      {UI_TEXT.review.card.addAdditionBtn}
                    </button>

                    {/* 隱藏式選單 (···)：僅保留 [ ◎ 帶走一小步 ] 與 [ ⌸ 封存 ] */}
                    <div className="relative">
                      <button 
                        type="button"
                        onClick={() => setShowMoreMenu(!showMoreMenu)}
                        className="text-ink-muted/40 hover:text-ink cursor-pointer px-1.5 py-1 text-sm tracking-widest transition-colors select-none"
                        title="更多"
                      >
                        ···
                      </button>

                      {showMoreMenu && (
                        <div className="absolute right-0 bottom-full mb-1.5 py-1 px-1 bg-surface border border-border-base rounded-xl shadow-md z-20 whitespace-nowrap min-w-[130px] space-y-0.5">
                          <button
                            type="button"
                            onClick={() => {
                              setShowMoreMenu(false);
                              setIsSettingAction(true);
                            }}
                            className="w-full flex items-center gap-2 text-xs text-ink-secondary hover:text-ink hover:bg-surface-hover px-3 py-2 rounded-lg cursor-pointer transition-colors text-left"
                          >
                            <Target size={13} className="text-ink-muted" />
                            <span>{UI_TEXT.review.card.takeStepBtn}</span>
                          </button>

                          <button
                            type="button"
                            onClick={handleSinkArchive}
                            className="w-full flex items-center gap-2 text-xs text-ink-secondary hover:text-ink hover:bg-surface-hover px-3 py-2 rounded-lg cursor-pointer transition-colors text-left"
                          >
                            <Archive size={13} className="text-ink-muted" />
                            <span>{UI_TEXT.review.card.archiveBtn}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
};
