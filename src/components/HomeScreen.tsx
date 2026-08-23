
import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { triggerHaptic } from '../utils/haptics';

interface HomeScreenProps {
  onStartInput: (text: string) => void;
  onSayNothing: () => void;
  onReview: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onStartInput, onSayNothing, onReview }) => {
  const [inputText, setInputText] = useState('');
  const [isSinking, setIsSinking] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const QUICK_OPTIONS = [
    '腦袋一直轉不停',
    '單純覺得好累',
    '突然想到一件事',
    '說不太清楚的感覺'
  ];

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

  const handleContinue = () => {
    if (!inputText.trim() || isSinking) return;
    triggerHaptic(25);
    setIsSinking(true);
    setTimeout(() => {
      onStartInput(inputText);
    }, 1000);
  };

  const handleSayNothing = () => {
    if (isSinking) return;
    triggerHaptic(30);
    setIsSinking(true);
    setTimeout(() => {
      onSayNothing();
    }, 1000);
  };

  return (
    <div 
      className={`w-full max-w-[500px] flex flex-col items-center text-center ${
        isSinking ? 'sink-animation pointer-events-none' : ''
      }`}
    >
      <h1 className="text-[26px] sm:text-[31px] font-medium tracking-[0.05em] text-[#424242] mb-6 sm:mb-10 text-center">
        此刻，腦中有什麼？
      </h1>
      
      <div className="w-full space-y-4 sm:space-y-6">
        <textarea
          ref={textareaRef}
          rows={1}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="點這裡寫下來..."
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

          <button 
            key="escape-door"
            type="button"
            onClick={handleSayNothing}
            className="text-[#9E9E9E] hover:text-[#424242] text-[15px] sm:text-[17px] transition-colors duration-300 py-3 cursor-pointer mt-1"
          >
            我現在說不上來
          </button>
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
          繼續
        </button>
      </div>

      {/* 獨立回望入口 */}
      <div className="pt-1">
        <button 
          type="button"
          onClick={() => {
            triggerHaptic(20);
            onReview();
          }}
          className="text-[13px] sm:text-[15px] tracking-[0.15em] text-[#A3A3A3] hover:text-[#424242] font-light transition-colors duration-200 cursor-pointer py-1 px-3"
        >
          回來看看
        </button>
      </div>
    </div>
  );
};

