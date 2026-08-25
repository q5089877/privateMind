import React, { useState } from 'react';
import { motion } from 'motion/react';
import { triggerHaptic } from '../utils/haptics';
import { UI_TEXT } from '../config/textConfig';

interface ActionScreenProps {
  thoughtContent?: string;
  onConfirm: (stepText: string) => void;
  onBackToDeposit: () => void;
}

export const ActionScreen: React.FC<ActionScreenProps> = ({ 
  thoughtContent, 
  onConfirm, 
  onBackToDeposit 
}) => {
  const [stepText, setStepText] = useState('');

  const handleFinish = () => {
    triggerHaptic([30, 40, 20]);
    onConfirm(stepText.trim() || thoughtContent || '');
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-lg space-y-6 sm:space-y-8 py-4 sm:py-6 flex flex-col items-center justify-center text-center"
    >
      {/* 念頭實體卡片（維持在同一個位置） */}
      <div className="w-full p-6 sm:p-7 rounded-2xl bg-[#FFFFFF] border border-[#E0E0E0] shadow-xs text-left space-y-3">
        <div className="text-xs text-[#A3A3A3] font-mono">
          {new Date().toLocaleString('zh-TW', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </div>
        <div className="text-lg sm:text-xl font-light leading-relaxed text-[#424242] whitespace-pre-wrap">
          {thoughtContent || ''}
        </div>
      </div>

      {/* 微步驟輸入區 */}
      <div className="w-full space-y-5 pt-1">
        <h2 className="text-xl sm:text-2xl font-light text-[#424242] tracking-wide">
          {UI_TEXT.action.title}
        </h2>

        <div className="space-y-4">
          <textarea
            autoFocus
            value={stepText}
            onChange={(e) => setStepText(e.target.value)}
            placeholder={UI_TEXT.action.whatNextPlaceholder}
            className="w-full bg-white/70 border border-[#E0E0E0] focus:border-[#424242] rounded-2xl text-[#424242] placeholder:text-[#9E9E9E] placeholder:font-light text-base sm:text-lg font-light p-4 outline-none resize-none min-h-[90px] leading-relaxed transition-colors"
          />

          <div className="flex flex-col items-center gap-3 pt-2">
            <button
              onClick={handleFinish}
              className="px-14 py-3.5 rounded-full bg-[#424242] text-[#FDFDFD] text-base sm:text-lg font-normal hover:bg-black transition-all shadow-xs active:scale-98 cursor-pointer"
            >
              {UI_TEXT.action.buttons.confirm}
            </button>

            <button 
              type="button"
              onClick={() => {
                triggerHaptic(15);
                onBackToDeposit();
              }}
              className="text-xs sm:text-sm text-[#A3A3A3] hover:text-[#424242] transition-colors cursor-pointer py-1"
            >
              {UI_TEXT.action.buttons.backToDeposit}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
