import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Leaf, Trash2 } from 'lucide-react';
import { ThoughtThread } from '../types';
import { UI_TEXT } from '../config/textConfig';
import { triggerHaptic } from '../utils/haptics';
import { AdditionForm } from './AdditionForm';

interface ThoughtCardProps {
  thread: ThoughtThread;
  onDelete: () => void;
  onRelease: () => void;
  onAppend: (content: string) => void;
}

export const ThoughtCard: React.FC<ThoughtCardProps> = ({ 
  thread, 
  onDelete, 
  onRelease, 
  onAppend
}) => {
  const [confirmType, setConfirmType] = useState<'DELETE' | 'RELEASE' | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  
  const isReleased = thread.isReleased;

  const handleConfirm = () => {
    if (confirmType === 'DELETE') {
      onDelete();
      setConfirmType(null);
    } else if (confirmType === 'RELEASE') {
      onRelease();
      setConfirmType(null);
    }
  };

  return (
    <motion.div 
      layout
      animate={{
        y: isReleased ? 4 : 0,
        scale: isReleased ? 0.99 : 1,
        opacity: isReleased ? 0.92 : 1,
      }}
      transition={{ duration: 1.2, ease: [0.25, 1, 0.5, 1] }}
      className={`p-6 sm:p-7 rounded-2xl border transition-colors duration-1000 relative overflow-hidden ${
        isReleased 
          ? 'bg-surface-subtle border-border-subtle shadow-none' 
          : 'bg-surface border-border-base shadow-xs'
      }`}
    >
      <AnimatePresence>
        {confirmType && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 bg-surface/95 backdrop-blur-xs flex flex-col items-center justify-center space-y-4"
          >
            <p className="text-sm text-ink font-light">
              {confirmType === 'DELETE' ? UI_TEXT.review.card.confirmDeleteTitle : UI_TEXT.review.card.confirmReleaseTitle}
            </p>
            <div className="flex gap-4">
              <button 
                onClick={() => setConfirmType(null)}
                className="px-5 py-1.5 text-xs rounded-full bg-surface-muted text-ink-secondary hover:text-ink transition-colors cursor-pointer"
              >
                {UI_TEXT.review.card.keepBtn}
              </button>
              <button 
                onClick={handleConfirm}
                className="px-5 py-1.5 text-xs rounded-full bg-border-base text-ink hover:bg-surface-hover transition-colors cursor-pointer"
              >
                {confirmType === 'DELETE' ? UI_TEXT.review.card.deleteBtn : UI_TEXT.review.card.releaseBtn}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex justify-between items-start gap-4">
        <div className="space-y-4 flex-grow">
          {/* 時間線內容流 */}
          <div className="space-y-4">
            {thread.entries.map((entry, index) => (
              <div 
                key={entry.id}
                className={`space-y-1.5 ${index > 0 ? 'pt-3 pl-3.5 border-l-2 border-border-base' : ''}`}
              >
                <div className="text-xs text-ink-muted font-mono flex items-center gap-2">
                  <span>
                    {new Date(entry.timestamp).toLocaleString('zh-TW', { 
                      month: 'short', 
                      day: 'numeric', 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </span>
                  {index === 0 && isReleased && (
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-surface text-ink-muted border border-border-subtle font-sans">
                      {UI_TEXT.review.card.releasedBadge}
                    </span>
                  )}
                </div>

                {entry.type === 'unspoken' ? (
                  <div className="text-base text-ink-muted italic font-light">
                    （這時候說不上來）
                  </div>
                ) : (
                  <div className="text-base sm:text-lg font-light leading-relaxed whitespace-pre-wrap text-ink">
                    {entry.content}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* ＋ 接著說…… / 展開輸入 */}
          {!isReleased && (
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
                  onSave={(content) => {
                    onAppend(content);
                    setIsAdding(false);
                  }}
                  onCancel={() => setIsAdding(false)}
                />
              )}
            </div>
          )}
        </div>

        {/* 狀態按鈕（放下 / 刪除） */}
        <div className="flex flex-col gap-1.5 pt-1 items-center">
          {!isReleased ? (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setConfirmType('RELEASE');
              }} 
              className="p-1.5 w-8 h-8 flex items-center justify-center text-ink-muted hover:text-ink cursor-pointer bg-surface-subtle hover:bg-surface-hover rounded-lg transition-colors" 
              title={UI_TEXT.review.card.releaseBtn}
            >
              <Leaf size={18} />
            </button>
          ) : (
            <>
              <div 
                className="p-1.5 w-8 h-8 flex items-center justify-center text-ink-muted/30 rounded-lg" 
                title={UI_TEXT.review.card.releasedBadge}
              >
                <Leaf size={18} />
              </div>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirmType('DELETE');
                }} 
                className="p-1.5 w-7 h-7 flex items-center justify-center text-ink-muted/40 hover:text-red-500 hover:bg-red-50/50 rounded-lg transition-colors cursor-pointer"
                title={UI_TEXT.review.card.deleteBtn}
              >
                <Trash2 size={14} />
              </button>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
};


