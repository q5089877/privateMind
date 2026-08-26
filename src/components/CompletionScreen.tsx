import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UI_TEXT } from '../config/textConfig';
import { Thought, ThoughtAddition } from '../types';
import { AdditionForm } from './AdditionForm';

interface CompletionScreenProps {
  thought: Partial<Thought>;
  onReset: () => void;
  onAddAddition?: (addition: ThoughtAddition) => void;
}

export const CompletionScreen: React.FC<CompletionScreenProps> = ({ 
  thought, 
  onReset,
  onAddAddition
}) => {
  const [isAdding, setIsAdding] = useState(false);

  const ceremonyText = thought.isAwarenessRecord
    ? UI_TEXT.completion.ceremony.unspoken
    : UI_TEXT.completion.ceremony.deposit;

  return (
    <div className="w-full max-w-lg space-y-6 sm:space-y-8 flex flex-col items-center text-center">
      {/* 沉降定格字樣 */}
      <div className="min-h-[40px] flex items-center justify-center">
        <p className="text-2xl sm:text-3xl font-light text-ink tracking-wide">
          {ceremonyText}
        </p>
      </div>

      {/* 已原地安放落座的念頭卡片（若為無文字事件，只顯示安靜空間） */}
      {!thought.isAwarenessRecord && thought.content && (
        <div 
          style={{ transform: 'translateY(36px)' }}
          className="w-full p-6 sm:p-7 rounded-2xl bg-surface-subtle border border-border-base shadow-sm text-left space-y-4 will-change-transform"
        >
          <div className="text-xs text-ink-muted font-mono">
            {new Date(thought.createdAt || Date.now()).toLocaleString('zh-TW', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </div>

          <div className="text-lg sm:text-xl font-light leading-relaxed text-ink whitespace-pre-wrap">
            {thought.content}
          </div>

          {thought.actionStep?.text && (
            <div className="p-3.5 bg-surface/80 rounded-xl border border-border-base space-y-1">
              <div className="text-xs text-ink-muted font-medium">下一步</div>
              <div className="text-sm sm:text-base font-normal text-ink">
                {thought.actionStep.text}
              </div>
            </div>
          )}

          {/* 顯示後來的 Additions (若有) */}
          {thought.additions && thought.additions.length > 0 && (
            <div className="pt-3 border-t border-border-subtle space-y-3">
              <div className="text-xs text-ink-muted">後來又想到 {thought.additions.length} 筆：</div>
              <div className="space-y-2">
                {thought.additions.map(add => (
                  <div key={add.id} className="pl-3 border-l-2 border-border-base text-sm text-ink-secondary space-y-1">
                    <div>{add.content}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 停靠時可直接繼續說 */}
          <AnimatePresence>
            {isAdding && onAddAddition && (
              <div className="pt-2">
                <AdditionForm 
                  onSave={(addition) => {
                    onAddAddition(addition);
                    setIsAdding(false);
                  }}
                  onCancel={() => setIsAdding(false)}
                />
              </div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* 底部出口（到這裡就好 / 繼續說） */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.8 }}
        style={{ transform: thought.isAwarenessRecord ? 'translateY(0px)' : 'translateY(36px)' }}
        className="w-full flex flex-col items-center gap-3 pt-2"
      >
        {!isAdding && !thought.isAwarenessRecord && onAddAddition && (
          <button 
            type="button"
            onClick={() => setIsAdding(true)}
            className="text-sm sm:text-base text-ink hover:text-ink-primary font-light py-2 px-5 rounded-full hover:bg-surface-hover transition-colors cursor-pointer active:scale-98"
          >
            {UI_TEXT.completion.exits.addAddition}
          </button>
        )}

        <button 
          type="button"
          onClick={onReset}
          className="text-xs sm:text-sm text-ink-muted hover:text-ink transition-colors py-1 cursor-pointer"
        >
          {UI_TEXT.completion.exits.backHome}
        </button>
      </motion.div>
    </div>
  );
};



