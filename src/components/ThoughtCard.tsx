import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Leaf } from 'lucide-react';
import { Thought, ThoughtAddition } from '../types';
import { UI_TEXT } from '../config/textConfig';
import { AdditionForm } from './AdditionForm';

interface ThoughtCardProps {
  thought: Thought;
  onDelete: () => void;
  onRelease: () => void;
  onUpdate: (t: Thought) => void;
  onAddAddition: (addition: ThoughtAddition) => void;
  onRemoveAddition: (additionId: string) => void;
}

export const ThoughtCard: React.FC<ThoughtCardProps> = ({ 
  thought, 
  onDelete, 
  onRelease,
  onAddAddition,
  onRemoveAddition
}) => {
  const [confirmType, setConfirmType] = useState<'DELETE' | 'RELEASE' | null>(null);
  const [isAdditionsExpanded, setIsAdditionsExpanded] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  
  const isReleased = thought.currentDisposition === 'RELEASE';

  const handleConfirm = () => {
    if (confirmType === 'DELETE') {
      onDelete();
      setConfirmType(null);
    } else if (confirmType === 'RELEASE') {
      onRelease();
      setConfirmType(null);
    }
  };

  let retentionText = '';
  if (thought.retentionUntil) {
    const d = new Date(thought.retentionUntil);
    retentionText = `${UI_TEXT.review.card.retentionPrefix}${d.getMonth() + 1} 月 ${d.getDate()} 日`;
  }

  return (
    <motion.div 
      layout
      animate={{
        y: isReleased ? 4 : 0,
        scale: isReleased ? 0.99 : 1,
        opacity: isReleased ? 0.92 : 1,
      }}
      transition={{ duration: 1.2, ease: [0.25, 1, 0.5, 1] }}
      className={`p-6 rounded-2xl border transition-colors duration-1000 relative overflow-hidden ${
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
        <div className="space-y-2 flex-grow">
          <div className="text-xs text-ink-muted font-mono flex items-center gap-2">
            <span>{new Date(thought.createdAt).toLocaleString('zh-TW', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
            {isReleased && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-surface text-ink-muted border border-border-subtle font-sans">
                放下了。
              </span>
            )}
          </div>
          
          <ThoughtContent thought={thought} />

          {thought.actionStep?.text && (
            <div className={`p-3.5 rounded-xl border space-y-1 transition-colors duration-700 ${
              isReleased 
                ? 'bg-surface/50 border-border-subtle opacity-75' 
                : 'bg-surface-subtle border-border-base'
            }`}>
              <div className="text-xs text-ink-muted font-medium">下一步</div>
              <div className={`text-base font-normal ${isReleased ? 'text-ink-secondary' : 'text-ink'}`}>
                {thought.actionStep.text}
              </div>
            </div>
          )}

          {isReleased && (
            <div className="mt-4 pt-4 border-t border-border-subtle space-y-3">
              <p className="text-sm text-ink-muted font-light text-center">{UI_TEXT.review.card.releasedSubtitle}</p>
              
              <div className="flex justify-center gap-3">
                <button 
                  onClick={() => setConfirmType('DELETE')} 
                  className="px-4 py-1 text-xs rounded-full bg-surface text-ink-muted hover:text-red-600 hover:bg-red-50/50 transition-colors cursor-pointer"
                >
                  {UI_TEXT.review.card.deleteBtn}
                </button>
              </div>

              {retentionText && (
                <p className="text-xs text-ink-muted text-center font-light">{retentionText}</p>
              )}
            </div>
          )}

          {/* Additions List */}
          {thought.additions && thought.additions.length > 0 && (
            <div className="mt-4 pt-4 border-t border-border-subtle space-y-3">
              <button 
                onClick={() => setIsAdditionsExpanded(!isAdditionsExpanded)}
                className="text-xs text-ink-secondary hover:text-ink transition-colors cursor-pointer flex items-center gap-1"
              >
                {isAdditionsExpanded ? '隱藏後來的念頭' : `後來又想到 ${thought.additions.length} 筆`}
                <span className="text-[10px] ml-1">{isAdditionsExpanded ? '▲' : '▼'}</span>
              </button>
              
              <AnimatePresence>
                {isAdditionsExpanded && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }} 
                    animate={{ opacity: 1, height: 'auto' }} 
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-3 overflow-hidden"
                  >
                    {thought.additions.map(add => (
                      <div key={add.id} className="pl-3 border-l-2 border-border-base space-y-1 relative group">
                        <button 
                          onClick={() => onRemoveAddition(add.id)}
                          className="absolute -right-2 top-0 p-1 opacity-0 group-hover:opacity-100 text-ink-muted hover:text-red-600 transition-all cursor-pointer"
                          title="刪除這筆痕跡"
                        >
                          ✕
                        </button>
                        <div className="text-[10px] text-ink-muted font-mono">
                          {new Date(add.createdAt).toLocaleString('zh-TW', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div className="text-sm font-light text-ink whitespace-pre-wrap">{add.content}</div>
                        {add.actionStep?.text && (
                          <div className="mt-1 p-2 bg-surface-subtle rounded-lg text-xs text-ink-secondary">
                            下一步：{add.actionStep.text}
                          </div>
                        )}
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Add Addition Form */}
          <div className="mt-4 pt-2">
            {!isAdding ? (
              <button 
                onClick={() => setIsAdding(true)}
                className="text-xs text-ink-muted hover:text-ink-secondary transition-colors cursor-pointer"
              >
                {UI_TEXT.addition.addBtn}
              </button>
            ) : (
              <AdditionForm 
                onSave={(addition) => {
                  onAddAddition(addition);
                  setIsAdding(false);
                  setIsAdditionsExpanded(true);
                }}
                onCancel={() => setIsAdding(false)}
              />
            )}
          </div>

        </div>

        <div className="flex flex-col gap-2 pt-1">
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
            <div 
              className="p-1.5 w-8 h-8 flex items-center justify-center text-ink-muted/40 rounded-lg" 
              title="放下了。"
            >
              <Leaf size={18} />
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

const ThoughtContent: React.FC<{ thought: Thought }> = ({ thought }) => {
  if (thought.awarenessOnly) {
    return <div className="text-ink-secondary italic font-light">{UI_TEXT.review.card.awareness}</div>;
  }

  return (
    <div className="text-lg font-light leading-relaxed whitespace-pre-wrap text-ink">
      {thought.content}
    </div>
  );
};
