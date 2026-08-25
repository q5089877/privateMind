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
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="w-full max-w-lg space-y-8 sm:space-y-10 text-center"
    >
      <div className="space-y-4">
        {thoughtContent && (
          <div className="text-xs sm:text-sm text-[#A3A3A3] font-light tracking-wide mb-2 italic">
            {UI_TEXT.action.contextPrefix}{thoughtContent}{UI_TEXT.action.contextSuffix}
          </div>
        )}
        <h2 className="text-xl sm:text-2xl font-light text-[#424242] leading-relaxed">
          {UI_TEXT.action.title}
        </h2>
      </div>

      <div className="space-y-6">
        <textarea
          autoFocus
          value={stepText}
          onChange={(e) => setStepText(e.target.value)}
          placeholder={UI_TEXT.action.whatNextPlaceholder}
          className="w-full bg-transparent border-b border-[#E0E0E0] focus:border-[#424242] text-[#424242] placeholder:text-[#9E9E9E] placeholder:font-light text-xl sm:text-2xl font-light text-center py-3 outline-none resize-none min-h-[90px] leading-relaxed"
        />

        <div className="flex flex-col items-center gap-4 pt-4">
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
    </motion.div>
  );
};
