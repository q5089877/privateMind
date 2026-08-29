import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles } from 'lucide-react';
import { UI_TEXT } from '../config/textConfig';
import { ThoughtThread } from '../types';
import { AdditionForm } from './AdditionForm';
import { ThoughtPrompts } from './ThoughtPrompts';
import { triggerHaptic } from '../utils/haptics';

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
  const [initialFormText, setInitialFormText] = useState('');
  const [showPrompts, setShowPrompts] = useState(false);

  if (!thread) return null;

  const ceremonyText = UI_TEXT.completion.ceremony.deposit;
  const lastEntryContent = thread.entries[thread.entries.length - 1]?.content || '';

  const handleSelectPrompt = (promptText: string) => {
    setInitialFormText(promptText);
    setShowPrompts(false);
    setIsAdding(true);
  };

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
        {/* 時間線思緒節點流 */}
        <div className="space-y-6 w-full text-left">
          {thread.entries.map((entry) => (
            <div key={entry.id} className="space-y-1.5">
              <div className="text-xs text-ink-muted/50 font-mono select-none tracking-wider">
                {formatTimestamp(entry.createdAt)}
              </div>
              <div className="text-base sm:text-lg font-light leading-relaxed whitespace-pre-wrap text-ink">
                {entry.content}
              </div>
            </div>
          ))}
        </div>

        {/* 思考提示庫展開區 */}
        <AnimatePresence>
          {showPrompts && (
            <div className="pt-2">
              <ThoughtPrompts
                contextText={lastEntryContent}
                onSelectPrompt={handleSelectPrompt}
                onClose={() => setShowPrompts(false)}
              />
            </div>
          )}
        </AnimatePresence>

        {/* 停靠時可直接接著說 */}
        <AnimatePresence>
          {isAdding && onAppendEntry && (
            <div className="pt-2">
              <AdditionForm 
                initialContent={initialFormText}
                contextText={lastEntryContent}
                onSave={(content, type) => {
                  onAppendEntry(content, type);
                  setIsAdding(false);
                  setInitialFormText('');
                }}
                onCancel={() => {
                  setIsAdding(false);
                  setInitialFormText('');
                }}
              />
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* 底部出口（到這裡就好 / ＋ 接著說 / 陪我想想） */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.6 }}
        style={{ transform: 'translateY(16px)' }}
        className="w-full flex flex-col items-center gap-3 pt-2"
      >
        {!isAdding && onAppendEntry && (
          <div className="flex items-center gap-2">
            <button 
              type="button"
              onClick={() => {
                setInitialFormText('');
                setIsAdding(true);
                setShowPrompts(false);
              }}
              className="text-sm sm:text-base text-ink hover:text-ink-primary font-normal py-2 px-5 rounded-full hover:bg-surface-hover transition-colors cursor-pointer active:scale-98"
            >
              {UI_TEXT.completion.exits.addAddition}
            </button>

            {!showPrompts && (
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('step');
                  setShowPrompts(true);
                }}
                className="flex items-center gap-1 text-xs sm:text-sm text-ink-muted hover:text-ink py-2 px-3.5 rounded-full hover:bg-surface-hover transition-colors cursor-pointer active:scale-98"
              >
                <Sparkles size={13} className="text-ink-muted" />
                <span>{UI_TEXT.promptEngine.triggerBtn}</span>
              </button>
            )}
          </div>
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
