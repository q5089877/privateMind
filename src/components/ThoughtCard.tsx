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
          {/* 主操作：內容追加 (最明顯) */}
          <button 
            type="button"
            onClick={() => setIsAdding(true)}
            className="w-full py-2 px-4 rounded-xl bg-surface-subtle hover:bg-surface-hover border border-border-base/60 text-ink hover:text-ink text-sm font-normal tracking-wide transition-all cursor-pointer active:scale-[0.99] text-center"
          >
            {UI_TEXT.addition.addBtn}
          </button>

          {/* 次要導航操作 vs 邊緣破壞性操作 */}
          <div className="flex items-center justify-between pt-0.5">
            <button 
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                triggerHaptic('settle');
                onLeave();
              }} 
              className="flex items-center gap-1.5 text-xs text-ink-muted hover:text-ink cursor-pointer py-1 px-2 rounded-lg hover:bg-surface-subtle transition-colors active:scale-98"
              title="離開目前畫面，回到首頁"
            >
              <Leaf size={14} className="text-ink-muted" />
              <span>{UI_TEXT.review.card.releaseBtn}</span>
            </button>

            <button 
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowDeleteConfirm(true);
              }} 
              className="flex items-center gap-1 text-[11px] text-ink-muted/40 hover:text-red-500 cursor-pointer py-1 px-2 rounded-lg hover:bg-red-50/40 transition-colors active:scale-98"
              title="本機永久移除紀錄"
            >
              <Trash2 size={12} />
              <span>{UI_TEXT.review.card.deleteBtn}</span>
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
};


