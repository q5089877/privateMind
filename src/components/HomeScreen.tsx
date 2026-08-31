
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MoreHorizontal } from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';
import { UI_TEXT } from '../config/textConfig';

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
      textareaRef.current.style.height = `${Math.max(textareaRef.current.scrollHeight, 80)}px`;
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

  const handleSettle = () => {
    if (isSinking) return;
    textareaRef.current?.blur();
    triggerHaptic('unlatch');
    setIsSinking(true);
    timerRef.current = setTimeout(() => {
      triggerHaptic('docking');
      if (inputText.trim()) {
        onStartInput(inputText);
      } else {
        onSayNothing?.();
      }
    }, 1800);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSettle();
    }
  };

  return (
    <div className="w-full max-w-[480px] flex flex-col items-center min-h-[calc(100vh-100px)] justify-between py-2">
      {/* 頂部導航列：品牌標誌與選單 */}
      <div className={`w-full flex justify-between items-center select-none transition-opacity duration-300 ${isSinking ? 'opacity-0 pointer-events-none' : ''}`}>
        <span className="text-xs sm:text-sm tracking-wider font-light text-ink-muted/90 uppercase">
          {UI_TEXT.home.brandTitle}
        </span>
        <button
          type="button"
          onClick={() => {
            triggerHaptic('step');
            onReview();
          }}
          className="w-8 h-8 rounded-full flex items-center justify-center text-ink-muted/70 hover:text-ink hover:bg-surface/60 transition-colors cursor-pointer"
          title="選單"
        >
          <MoreHorizontal size={18} />
        </button>
      </div>

      {/* 中間主工作區 */}
      <div className="w-full flex flex-col items-center my-auto py-6 sm:py-8 space-y-6">
        {/* 標題與副標題 */}
        <div className={`w-full text-left space-y-1.5 px-1 select-none transition-opacity duration-300 ${isSinking ? 'opacity-0 pointer-events-none' : ''}`}>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-ink">
            {UI_TEXT.home.title}
          </h1>
          <p className="text-sm sm:text-base text-ink-muted/85 font-light">
            {UI_TEXT.home.subtitle}
          </p>
        </div>

        {/* 獨立白色浮起輸入卡片 */}
        <div className={`w-full bg-surface rounded-[28px] p-5 sm:p-6 shadow-sm border border-border-subtle flex flex-col justify-between min-h-[220px] transition-all duration-500 ${isSinking ? 'sink-animation pointer-events-none' : ''}`}>
          <textarea
            ref={textareaRef}
            rows={3}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isSinking ? '' : UI_TEXT.home.inputPlaceholder}
            className="w-full bg-transparent text-ink placeholder:text-ink-muted/65 font-light text-sm sm:text-base leading-relaxed outline-none resize-none selection:bg-accent/15 border-none p-0"
            autoFocus
          />

          {/* 卡片內部底端的「放下」主按鈕 */}
          <div className="pt-4">
            <button
              type="button"
              onClick={handleSettle}
              className="w-full py-3.5 rounded-2xl bg-accent text-accent-text hover:bg-accent-hover text-base font-normal tracking-wider transition-all duration-200 cursor-pointer active:scale-[0.99] shadow-xs flex justify-center items-center"
            >
              {UI_TEXT.home.submit}
            </button>
          </div>
        </div>

        {/* 快捷選項 Chips（排列成乾淨的自然網格） */}
        <div className={`w-full flex flex-wrap gap-2 pt-1 select-none transition-opacity duration-300 ${isSinking ? 'opacity-0 pointer-events-none' : ''}`}>
          {QUICK_OPTIONS.map((option, idx) => (
            <button
              key={`quick-opt-${idx}`}
              type="button"
              onClick={() => handleQuickSelect(option)}
              className="py-2 px-4 rounded-full border border-border-subtle bg-surface/80 hover:bg-surface hover:border-border-base text-ink-secondary hover:text-ink text-xs sm:text-sm font-light transition-all duration-200 cursor-pointer active:scale-[0.98] shadow-2xs"
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      {/* 底部區域：再次相遇 與 哲學宣言 */}
      <div className={`w-full flex flex-col items-center space-y-4 pt-4 select-none transition-opacity duration-300 ${isSinking ? 'opacity-0 pointer-events-none' : ''}`}>
        <button
          type="button"
          onClick={() => {
            if (isSinking) return;
            triggerHaptic('unlatch');
            onReview();
          }}
          className="text-sm text-ink-secondary hover:text-ink transition-colors cursor-pointer py-1.5 px-4 font-light tracking-wide flex items-center gap-1"
        >
          <span>{UI_TEXT.home.reviewPast}</span>
        </button>

        <p className="text-[11px] sm:text-xs text-ink-muted/70 font-light text-center tracking-wider max-w-[340px] leading-relaxed">
          {UI_TEXT.home.footerPhilosophy}
        </p>
      </div>
    </div>
  );
};
