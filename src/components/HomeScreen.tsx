
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { triggerHaptic } from '../utils/haptics';
import { UI_TEXT, CORE_PHILOSOPHY } from '../config/textConfig';

interface HomeScreenProps {
  onStartInput: (text: string) => void;
  onSayNothing?: () => void;
  onReview: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onStartInput, onSayNothing, onReview }) => {
  const [inputText, setInputText] = useState('');
  const [isSinking, setIsSinking] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const QUICK_OPTIONS = UI_TEXT.home.quickOptions;

  // 自動調整高度
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.max(textareaRef.current.scrollHeight, 68)}px`;
    }
  }, [inputText]);

  // 進入即取得焦點，喚起鍵盤
  useEffect(() => {
    const focusTimer = setTimeout(() => {
      textareaRef.current?.focus();
    }, 60);
    return () => clearTimeout(focusTimer);
  }, []);

  const handleQuickSelect = (text: string) => {
    if (isSinking) return;
    triggerHaptic('step');
    setInputText(text);
    textareaRef.current?.focus();
  };

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  // 0.0s 點擊「停靠」：脫扣震動、收起鍵盤、周遭環境 0.3s 散去，唯獨文字 2.0s 慢速縮小至 50% 下沉
  const handleContinue = () => {
    if (!inputText.trim() || isSinking) return;
    textareaRef.current?.blur();
    triggerHaptic('unlatch');
    setIsSinking(true);
    timerRef.current = setTimeout(() => {
      triggerHaptic('docking');
      onStartInput(inputText);
    }, 2000);
  };

  const handleSayNothing = () => {
    if (isSinking) return;
    textareaRef.current?.blur();
    triggerHaptic('unlatch');
    setIsSinking(true);
    timerRef.current = setTimeout(() => {
      triggerHaptic('docking');
      onSayNothing?.();
    }, 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleContinue();
    }
  };

  return (
    <div className="w-full max-w-[690px] flex flex-col items-center">
      {/* 頂部右上角：弱化次要入口「再次相遇」（沉降時 0.3s 率先散去） */}
      <div className={`w-full flex justify-end pb-6 sm:pb-10 select-none transition-opacity duration-300 ${isSinking ? 'opacity-0 pointer-events-none' : ''}`}>
        <button
          type="button"
          onClick={() => {
            if (isSinking) return;
            triggerHaptic('unlatch');
            onReview();
          }}
          className="text-xs sm:text-sm text-ink-muted hover:text-ink transition-colors cursor-pointer py-1.5 px-3 rounded-full hover:bg-surface-hover tracking-wider font-light"
        >
          {UI_TEXT.home.reviewPast}
        </button>
      </div>

      {/* 主工作區 */}
      <div className="w-full flex flex-col items-center text-center space-y-5 sm:space-y-7 pt-2 sm:pt-4">
        {/* 標題與核心免責許可副標（沉降時 0.3s 率先散去） */}
        <div className={`space-y-1.5 select-none transition-opacity duration-300 ${isSinking ? 'opacity-0 pointer-events-none' : ''}`}>
          <h1 className="text-xl sm:text-2xl font-medium tracking-tight text-ink">
            {UI_TEXT.home.title}
          </h1>
          <p className="text-xs sm:text-sm text-ink-muted/80 font-light tracking-wide">
            {UI_TEXT.home.subtitle}
          </p>
        </div>

        {/* 無邊界多行輸入區：沉降時作為全畫面唯一焦點，2.0s 慢速縮小至 25% 沉落 */}
        <div className={`w-full relative px-2 ${isSinking ? 'sink-animation pointer-events-none' : ''}`}>
          <textarea
            ref={textareaRef}
            rows={2}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isSinking ? '' : UI_TEXT.home.inputPlaceholder}
            className="w-full bg-transparent text-ink placeholder:text-ink-muted placeholder:font-light font-light text-lg sm:text-xl leading-[1.8] outline-none resize-none text-center selection:bg-accent/15 border-none"
            autoFocus
          />
        </div>

        {/* 輕盈流動標籤（沉降時 0.3s 率先散去） */}
        <div className={`w-full flex flex-wrap justify-center gap-2 sm:gap-2.5 pt-1 select-none transition-opacity duration-300 ${isSinking ? 'opacity-0 pointer-events-none' : ''}`}>
          {QUICK_OPTIONS.map((option, idx) => (
            <button
              key={`quick-opt-${idx}`}
              type="button"
              onClick={() => handleQuickSelect(option)}
              className="py-1.5 px-3.5 rounded-full border border-border-base bg-surface-subtle hover:bg-surface hover:border-border-focus text-ink-secondary hover:text-ink text-xs sm:text-sm font-light transition-all duration-200 cursor-pointer active:scale-[0.98]"
            >
              {option}
            </button>
          ))}
        </div>

        {/* 動作按鈕（沉降時 0.3s 率先散去） */}
        <div className={`pt-3 h-12 flex justify-center items-center w-full transition-opacity duration-300 ${isSinking ? 'opacity-0 pointer-events-none' : ''}`}>
          <AnimatePresence mode="wait">
            {inputText.trim() ? (
              <motion.button
                key="submit-btn"
                type="button"
                initial={{ opacity: 0, y: 6, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.96 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                onClick={handleContinue}
                className="px-8 py-2 bg-accent text-accent-text hover:bg-accent-hover rounded-full text-sm sm:text-base font-normal tracking-wide transition-colors cursor-pointer active:scale-98 shadow-xs"
              >
                {UI_TEXT.home.submit}
              </motion.button>
            ) : (
              <motion.button
                key="say-nothing-btn"
                type="button"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.22 }}
                onClick={handleSayNothing}
                className="text-xs sm:text-sm text-ink-muted hover:text-ink transition-colors py-1.5 px-4 rounded-full hover:bg-surface-hover cursor-pointer font-light select-none"
              >
                {UI_TEXT.home.sayNothing}
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

