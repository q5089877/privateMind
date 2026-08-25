
import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { triggerHaptic } from '../utils/haptics';
import { UI_TEXT } from '../config/textConfig';

interface HomeScreenProps {
  onStartInput: (text: string) => void;
  onSayNothing: () => void;
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
      textareaRef.current.style.height = `${Math.max(textareaRef.current.scrollHeight, 50)}px`;
    }
  }, [inputText]);

  const handleQuickSelect = (text: string) => {
    if (isSinking) return;
    triggerHaptic(15);
    setInputText(text);
    // 不再自動送出，保留修改空間
  };

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const handleContinue = () => {
    if (!inputText.trim() || isSinking) return;
    triggerHaptic(25);
    setIsSinking(true);
    timerRef.current = setTimeout(() => {
      onStartInput(inputText);
    }, 1400);
  };

  const handleSayNothing = () => {
    if (isSinking) return;
    triggerHaptic(30);
    setIsSinking(true);
    timerRef.current = setTimeout(() => {
      onSayNothing();
    }, 1400);
  };

  return (
    <div
      className={`w-full max-w-[500px] flex flex-col items-center text-center ${
        isSinking ? 'sink-animation pointer-events-none' : ''
      }`}
    >
      <h1 className="text-[26px] sm:text-[31px] font-medium tracking-[0.05em] text-[#424242] mb-6 sm:mb-10 text-center">
        {UI_TEXT.home.title}
      </h1>

      <div className="w-full space-y-4 sm:space-y-6">
        <textarea
          ref={textareaRef}
          rows={1}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={UI_TEXT.home.inputPlaceholder}
          className="w-full bg-transparent border-b border-[#E0E0E0] focus:border-[#424242] text-[#424242] placeholder:text-[#9E9E9E] placeholder:font-light transition-colors duration-300 py-2.5 sm:py-3.5 text-[20px] sm:text-[23px] outline-none resize-none text-center leading-[1.5]"
          autoFocus
        />

        {/* 狀態入口區 */}
        <div className="flex flex-col gap-2.5">
          <div className="flex flex-col gap-2.5">
            {QUICK_OPTIONS.map((option, idx) => (
              <button
                key={`quick-opt-${idx}`}
                onClick={() => handleQuickSelect(option)}
                className="w-full py-3.5 px-4 bg-[#FFFFFF] border border-[#E0E0E0] hover:border-[#424242] text-[#5E5E5E] hover:text-[#424242] rounded-xl text-[16px] sm:text-[18px] transition-all duration-200 cursor-pointer active:scale-[0.99] shadow-xs"
              >
                {option}
              </button>
            ))}
          </div>

          <div className="flex justify-center items-center gap-4 mt-2">
            <button
              type="button"
              onClick={handleSayNothing}
              className="text-[#9E9E9E] hover:text-[#424242] text-[15px] sm:text-[17px] transition-colors duration-300 py-2 cursor-pointer"
            >
              {UI_TEXT.home.sayNothing}
            </button>
            <div className="w-[1px] h-[14px] bg-[#E0E0E0]"></div>
            <button
              type="button"
              onClick={() => {
                if (isSinking) return;
                triggerHaptic(20);
                onReview();
              }}
              className="text-[#9E9E9E] hover:text-[#424242] text-[15px] sm:text-[17px] transition-colors duration-300 py-2 cursor-pointer"
            >
              {UI_TEXT.home.reviewPast}
            </button>
          </div>
        </div>
      </div>

      {/* 動作按鈕區 */}
      <div className="mt-2 sm:mt-4 flex justify-center items-center w-full">
        <button
          type="button"
          onClick={handleContinue}
          disabled={!inputText.trim()}
          className={`px-8 sm:px-10 py-2.5 sm:py-3.5 bg-[#424242] text-[#F8F7F5] rounded-full text-[18px] sm:text-[21px] font-normal tracking-wide transition-all duration-400 cursor-pointer active:scale-98 ${
            inputText.trim()
              ? 'opacity-100 translate-y-0 pointer-events-auto'
              : 'opacity-0 translate-y-2 pointer-events-none h-0 overflow-hidden'
          }`}
        >
          {UI_TEXT.home.submit}
        </button>
      </div>

    </div>
  );
};

