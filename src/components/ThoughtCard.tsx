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
  const [dragY, setDragY] = useState(0);
  const [isLeaving, setIsLeaving] = useState(false);

  const handleDeleteConfirm = () => {
    onDelete();
    setShowDeleteConfirm(false);
  };

  const handleSettleLeave = () => {
    setIsLeaving(true);
    triggerHaptic('settle');
    setTimeout(() => {
      onLeave();
    }, 450);
  };

  const currentAction = thread.currentActionId 
    ? thread.entries.find(e => e.id === thread.currentActionId)
    : null;

  return (
    <div className="relative">
      <motion.div 
        layout
        drag={!isAdding && !showDeleteConfirm ? "y" : false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0.05, bottom: 0.7 }}
        onDrag={(_, info) => {
          if (info.offset.y > 0) {
            setDragY(info.offset.y);
          }
        }}
        onDragEnd={(_, info) => {
          if (info.offset.y > 85) {
            handleSettleLeave();
          } else {
            setDragY(0);
          }
        }}
        animate={
          isLeaving 
            ? { y: 70, opacity: 0, scale: 0.95, filter: 'blur(3px)' } 
            : { y: 0, opacity: Math.max(1 - dragY / 300, 0.45), scale: Math.max(1 - dragY / 1200, 0.96) }
        }
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="p-6 sm:p-7 rounded-2xl border bg-surface border-border-base shadow-xs relative overflow-hidden touch-pan-x cursor-grab active:cursor-grabbing"
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

    {/* 拖拉底層引導區：安靜浮現 */}
    <div 
      className={`absolute inset-x-0 -bottom-3 flex items-center justify-center pointer-events-none transition-opacity duration-200 ${
        dragY > 15 ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div className="flex items-center gap-1.5 text-xs text-ink-muted bg-surface/90 backdrop-blur-xs px-3 py-1 rounded-full border border-border-base/60 shadow-xs">
        <Leaf size={13} className={dragY > 85 ? 'text-accent' : 'text-ink-muted'} />
        <span className={dragY > 85 ? 'text-ink font-medium' : 'text-ink-muted'}>
          {dragY > 85 ? '鬆手放回首頁' : '輕輕往下拉……'}
        </span>
      </div>
    </div>
  </div>
  );
};


