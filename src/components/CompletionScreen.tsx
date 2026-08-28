import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UI_TEXT } from '../config/textConfig';
import { ThoughtThread } from '../types';
import { AdditionForm } from './AdditionForm';

interface CompletionScreenProps {
  thread: ThoughtThread | null;
  onReset: () => void;
  onAppendEntry?: (content: string, type?: import('../types').EntryType) => void;
}

const formatTimestamp = (timestamp: number) => {
  const d = new Date(timestamp);
  const month = d.getMonth() + 1;
  const date = d.getDate();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${month}/${date} ${hours}:${minutes}`;
};

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
        style={{ transform: 'translateY(16px)' }}
        className="w-full p-6 sm:p-7 rounded-2xl bg-surface-subtle border border-border-base shadow-xs text-left space-y-5 will-change-transform"
      >
        <div className="flex flex-col space-y-3.5 w-full">
          {thread.entries.map((entry, index) => {
            const isLeft = index % 2 === 0;
            return (
              <div 
                key={entry.id} 
                className={`flex w-full items-end gap-2 ${isLeft ? 'justify-start' : 'justify-end'}`}
              >
                {isLeft ? (
                  <div className="flex items-end gap-1.5 max-w-[88%] sm:max-w-[82%]">
                    <div className="bg-surface border border-border-base text-ink rounded-2xl rounded-tl-xs px-4 py-2.5 shadow-2xs">
                      <div className="text-base sm:text-lg font-light leading-relaxed whitespace-pre-wrap">
                        {entry.content}
                      </div>
                    </div>
                    <span className="text-[10px] text-ink-muted/70 font-mono shrink-0 select-none pb-0.5">
                      {formatTimestamp(entry.createdAt)}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-end gap-1.5 max-w-[88%] sm:max-w-[82%]">
                    <span className="text-[10px] text-ink-muted/70 font-mono shrink-0 select-none pb-0.5">
                      {formatTimestamp(entry.createdAt)}
                    </span>
                    <div className="bg-surface-muted/90 border border-border-focus/30 text-ink rounded-2xl rounded-tr-xs px-4 py-2.5 shadow-2xs">
                      <div className="text-base sm:text-lg font-light leading-relaxed whitespace-pre-wrap">
                        {entry.content}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* 停靠時可直接接著說 */}
        <AnimatePresence>
          {isAdding && onAppendEntry && (
            <div className="pt-2">
              <AdditionForm 
                onSave={(content, type) => {
                  onAppendEntry(content, type);
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
        transition={{ delay: 0.1, duration: 0.6 }}
        style={{ transform: 'translateY(16px)' }}
        className="w-full flex flex-col items-center gap-3 pt-2"
      >
        {!isAdding && onAppendEntry && (
          <button 
            type="button"
            onClick={() => setIsAdding(true)}
            className="text-sm sm:text-base text-ink hover:text-ink-primary font-normal py-2 px-6 rounded-full hover:bg-surface-hover transition-colors cursor-pointer active:scale-98"
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




