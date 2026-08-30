import React, { useState, useEffect, useRef } from 'react';
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
  const [showNotice, setShowNotice] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // V7.2 時序：0.25s~0.8s 淡入 -> 0.8s~3.0s 安靜停留 -> 3.0s~3.8s 提示淡出
  useEffect(() => {
    timerRef.current = setTimeout(() => {
      setShowNotice(false);
    }, 3000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // 中斷規則：點擊「＋ 接著說」立即淡出提示並就地展開輸入框
  const handleStartAdd = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setShowNotice(false);
    setIsAdding(true);
  };

  if (!thread) return null;

  const ceremonyText = UI_TEXT.completion.ceremony.deposit;
  const lastEntryContent = thread.entries[thread.entries.length - 1]?.content || '';

  return (
    <div className="w-full max-w-xl space-y-4 sm:space-y-5 flex flex-col items-center text-center">
      {/* 0.25s~0.8s 淡入，3.0s~3.8s 淡出；提示短暫存在，卡片永久留下 */}
      <div className="min-h-[32px] flex items-center justify-center pt-2 select-none">
        <AnimatePresence>
          {showNotice && !isAdding && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, transition: { duration: 0.8 } }}
              transition={{ delay: 0.25, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
              className="text-lg sm:text-xl font-light text-ink tracking-wide"
            >
              {ceremonyText}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Entry 落定就位（卡片永久留下作為確認） */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.88, y: -12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="w-full p-4 sm:p-5 rounded-2xl bg-surface-subtle border border-border-base text-left space-y-3.5 shadow-sm"
        style={{ borderLeftColor: 'rgba(75,95,85,0.45)', borderLeftWidth: '2px' }}
      >
        <div className="space-y-3 w-full text-left">
          {thread.entries.map((entry) => (
            <div key={entry.id} className="space-y-1">
              <div className="text-xs text-ink-muted font-mono select-none tracking-tight">
                {formatTimestamp(entry.createdAt)}
              </div>
              <div className="text-sm sm:text-base font-normal leading-relaxed whitespace-pre-wrap text-ink">
                {entry.content}
              </div>
            </div>
          ))}
        </div>

        {/* ＋ 接著說…… 就地展開輸入區（Focus 喚起鍵盤） */}
        <AnimatePresence>
          {isAdding && onAppendEntry && (
            <div className="pt-1">
              <AdditionForm 
                contextText={lastEntryContent}
                onSave={(content, type) => {
                  onAppendEntry(content, type);
                  setIsAdding(false);
                }}
                onCancel={() => {
                  setIsAdding(false);
                }}
              />
            </div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* 底部出口：＋ 接著說…… / 到這裡就好（安靜停留，零催促） */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.25, duration: 0.4 }}
        className="w-full flex flex-col items-center gap-1.5 pt-1 select-none"
      >
        {/* 儀式文字消失後的靜態定向提示 */}
        <AnimatePresence>
          {!showNotice && !isAdding && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, ease: 'easeIn' }}
              className="text-xs text-ink-muted font-light tracking-wide mb-1"
            >
              已記下。可以繼續，也可以就這樣。
            </motion.p>
          )}
        </AnimatePresence>

        {!isAdding && onAppendEntry && (
          <button 
            type="button"
            onClick={handleStartAdd}
            className="text-xs sm:text-sm text-ink hover:text-ink-primary font-normal py-1.5 px-4 rounded-full hover:bg-surface-hover transition-colors cursor-pointer active:scale-98"
          >
            {UI_TEXT.completion.exits.addAddition}
          </button>
        )}

        <button 
          type="button"
          onClick={onReset}
          className="text-xs text-ink-muted/60 hover:text-ink transition-colors py-1 px-3 rounded-full cursor-pointer hover:bg-surface-hover/50 font-light"
        >
          {UI_TEXT.completion.exits.backHome}
        </button>
      </motion.div>
    </div>
  );
};
