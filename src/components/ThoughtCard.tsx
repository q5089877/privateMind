import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Leaf, Trash2 } from 'lucide-react';
import { ThoughtThread, EntryType } from '../types';
import { UI_TEXT } from '../config/textConfig';
import { triggerHaptic } from '../utils/haptics';
import { AdditionForm } from './AdditionForm';

interface ThoughtCardProps {
  thread: ThoughtThread;
  onDelete: () => void;
  onLeave: () => void;
  onAppend: (content: string, type: EntryType) => void;
  onSetCurrentAction?: (entryId: string | null) => void;
}

export const ThoughtCard: React.FC<ThoughtCardProps> = ({ 
  thread, 
  onDelete, 
  onLeave, 
  onAppend,
  onSetCurrentAction
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  const handleDeleteConfirm = () => {
    onDelete();
    setShowDeleteConfirm(false);
  };

  const currentAction = thread.currentActionId 
    ? thread.entries.find(e => e.id === thread.currentActionId)
    : null;

  return (
    <motion.div 
      layout
      transition={{ duration: 0.3, ease: [0.25, 1, 0.5, 1] }}
      className="p-6 sm:p-7 rounded-2xl border bg-surface border-border-base shadow-xs relative overflow-hidden"
    >
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 bg-surface/95 backdrop-blur-xs flex flex-col items-center justify-center space-y-4"
          >
            <p className="text-sm text-ink font-light text-center px-4">
              {UI_TEXT.review.card.confirmDeleteTitle}
            </p>
            <div className="flex gap-4">
              <button 
                onClick={() => setShowDeleteConfirm(false)}
                className="px-5 py-1.5 text-xs rounded-full bg-surface-muted text-ink-secondary hover:text-ink transition-colors cursor-pointer"
              >
                {UI_TEXT.review.card.keepBtn}
              </button>
              <button 
                onClick={handleDeleteConfirm}
                className="px-5 py-1.5 text-xs rounded-full bg-border-base text-ink hover:bg-surface-hover transition-colors cursor-pointer"
              >
                {UI_TEXT.review.card.deleteBtn}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex justify-between items-start gap-4">
        <div className="space-y-4 flex-grow">
          {/* 當前行動：唯一有效版本置頂 */}
          {currentAction && (
            <div className="p-4 rounded-xl bg-surface-subtle border border-border-base/70 space-y-1.5">
              <div className="flex justify-between items-center text-[11px] font-mono tracking-wider text-ink-muted">
                <span>【{UI_TEXT.review.currentActionTitle}】</span>
                {onSetCurrentAction && (
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
                {currentAction.content}
              </div>
            </div>
          )}

          {/* 歷史時間線分隔線 */}
          {currentAction && (
            <div className="text-[11px] text-ink-muted/50 tracking-wider text-center my-2 select-none">
              ── {UI_TEXT.review.historyTimelineTitle} ──
            </div>
          )}

          {/* 時間線內容流 */}
          <div className="space-y-4">
            {thread.entries.map((entry, index) => (
              <div 
                key={entry.id}
                className={`space-y-1.5 ${index > 0 ? 'pt-3 pl-3.5 border-l-2 border-border-base' : ''}`}
              >
                <div className="text-xs text-ink-muted font-mono flex items-center justify-between">
                  <span>
                    {new Date(entry.createdAt).toLocaleString('zh-TW', { 
                      month: 'short', 
                      day: 'numeric', 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </span>
                  {entry.id !== thread.currentActionId && onSetCurrentAction && (
                    <button
                      type="button"
                      onClick={() => onSetCurrentAction(entry.id)}
                      className="text-[11px] text-ink-muted hover:text-ink transition-colors cursor-pointer"
                    >
                      設為當前行動
                    </button>
                  )}
                </div>

                <div className="text-base sm:text-lg font-light leading-relaxed whitespace-pre-wrap text-ink">
                  {entry.content}
                </div>
              </div>
            ))}
          </div>

          {/* ＋ 接著說…… / 展開輸入 */}
          <div className="pt-2">
            {!isAdding ? (
              <button 
                onClick={() => setIsAdding(true)}
                className="text-xs sm:text-sm text-ink-muted hover:text-ink transition-colors cursor-pointer"
              >
                {UI_TEXT.addition.addBtn}
              </button>
            ) : (
              <AdditionForm 
                onSave={(content, type) => {
                  onAppend(content, type);
                  setIsAdding(false);
                }}
                onCancel={() => setIsAdding(false)}
              />
            )}
          </div>
        </div>

        {/* 物理操作按鈕（先放這裡 / 刪除） */}
        <div className="flex flex-col gap-2 pt-1 items-center">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              triggerHaptic('settle');
              onLeave();
            }} 
            className="p-1.5 w-8 h-8 flex items-center justify-center text-ink-muted hover:text-ink cursor-pointer bg-surface-subtle hover:bg-surface-hover rounded-lg transition-colors" 
            title={UI_TEXT.review.card.releaseBtn}
          >
            <Leaf size={18} />
          </button>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setShowDeleteConfirm(true);
            }} 
            className="p-1.5 w-8 h-8 flex items-center justify-center text-ink-muted/50 hover:text-red-500 hover:bg-red-50/50 rounded-lg transition-colors cursor-pointer"
            title={UI_TEXT.review.card.deleteBtn}
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </motion.div>
  );
};


