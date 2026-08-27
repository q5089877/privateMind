import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UI_TEXT } from '../config/textConfig';
import { ThoughtThread } from '../types';
import { AdditionForm } from './AdditionForm';

interface CompletionScreenProps {
  thread: ThoughtThread | null;
  onReset: () => void;
  onAppendEntry?: (content: string) => void;
}

export const CompletionScreen: React.FC<CompletionScreenProps> = ({ 
  thread, 
  onReset,
  onAppendEntry
}) => {
  const [isAdding, setIsAdding] = useState(false);

  if (!thread) return null;

  const ceremonyText = UI_TEXT.completion.ceremony.deposit;

  return (
    <div className="w-full max-w-lg space-y-6 sm:space-y-8 flex flex-col items-center text-center">
      {/* 定格字樣 */}
      <div className="min-h-[40px] flex items-center justify-center">
        <p className="text-2xl sm:text-3xl font-light text-ink tracking-wide">
          {ceremonyText}
        </p>
      </div>

      {/* 時間線卡片 */}
      <div 
        style={{ transform: 'translateY(24px)' }}
        className="w-full p-6 sm:p-7 rounded-2xl bg-surface-subtle border border-border-base shadow-sm text-left space-y-5 will-change-transform"
      >
        <div className="space-y-4">
          {thread.entries.map((entry, index) => (
            <div 
              key={entry.id}
              className={`space-y-1.5 ${index > 0 ? 'pt-3 pl-3 border-l-2 border-border-base' : ''}`}
            >
              <div className="text-xs text-ink-muted font-mono">
                {new Date(entry.createdAt).toLocaleString('zh-TW', { 
                  month: 'short', 
                  day: 'numeric', 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </div>
              
              <div className="text-lg sm:text-xl font-light leading-relaxed text-ink whitespace-pre-wrap">
                {entry.content}
              </div>
            </div>
          ))}
        </div>

        {/* 停靠時可直接接著說 */}
        <AnimatePresence>
          {isAdding && onAppendEntry && (
            <div className="pt-2">
              <AdditionForm 
                onSave={(content) => {
                  onAppendEntry(content);
                  setIsAdding(false);
                }}
                onCancel={() => setIsAdding(false)}
              />
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* 底部出口（到這裡就好 / ＋ 接著說） */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.8 }}
        style={{ transform: 'translateY(24px)' }}
        className="w-full flex flex-col items-center gap-3 pt-2"
      >
        {!isAdding && onAppendEntry && (
          <button 
            type="button"
            onClick={() => setIsAdding(true)}
            className="text-sm sm:text-base text-ink hover:text-ink-primary font-light py-2 px-6 rounded-full hover:bg-surface-hover transition-colors cursor-pointer active:scale-98"
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




