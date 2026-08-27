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
  onLeave: () => void;
  onAppend: (content: string) => void;
}

export const ThoughtCard: React.FC<ThoughtCardProps> = ({ 
  thread, 
  onDelete, 
  onLeave, 
  onAppend
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  const handleDeleteConfirm = () => {
    onDelete();
    setShowDeleteConfirm(false);
  };

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
            <p className="text-sm text-ink font-light">
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
          {/* 時間線內容流 */}
          <div className="space-y-4">
            {thread.entries.map((entry, index) => (
              <div 
                key={entry.id}
                className={`space-y-1.5 ${index > 0 ? 'pt-3 pl-3.5 border-l-2 border-border-base' : ''}`}
              >
                <div className="text-xs text-ink-muted font-mono">
                  {new Date(entry.createdAt).toLocaleString('zh-TW', { 
                    month: 'short', 
                    day: 'numeric', 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
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
                onSave={(content) => {
                  onAppend(content);
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


