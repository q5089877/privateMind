import React from 'react';
import { motion } from 'motion/react';
import { Archive, ArrowRight } from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';
import { UI_TEXT } from '../config/textConfig';

interface ShuntScreenProps {
  thoughtContent?: string;
  onChooseDeposit: () => void;
  onChooseAction: () => void;
}

export const ShuntScreen: React.FC<ShuntScreenProps> = ({ 
  thoughtContent, 
  onChooseDeposit, 
  onChooseAction 
}) => {
  const handleDeposit = () => {
    triggerHaptic([30, 40, 20]);
    onChooseDeposit();
  };

  const handleAction = () => {
    triggerHaptic(20);
    onChooseAction();
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-lg space-y-6 sm:space-y-8 py-4 sm:py-6 flex flex-col items-center justify-center text-center"
    >
      {/* 念頭實體卡片（直接在此定格呈現） */}
      <div className="w-full p-6 sm:p-7 rounded-2xl bg-[#FFFFFF] border border-[#E0E0E0] shadow-xs text-left space-y-3">
        <div className="text-xs text-[#A3A3A3] font-mono">
          {new Date().toLocaleString('zh-TW', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </div>
        <div className="text-lg sm:text-xl font-light leading-relaxed text-[#424242] whitespace-pre-wrap">
          {thoughtContent || ''}
        </div>
      </div>

      {/* 分流問句與按鈕區 */}
      <div className="w-full space-y-4 pt-1">
        <h2 className="text-xl sm:text-2xl font-light text-[#424242] tracking-wide">
          {UI_TEXT.shunt.title}
        </h2>
        
        <div className="grid gap-3 sm:gap-4">
          <button 
            onClick={handleDeposit}
            className="group flex items-center justify-between px-5 sm:px-7 py-4 sm:py-5 bg-[#FFFFFF] border border-[#E0E0E0] hover:border-[#424242] rounded-2xl transition-all duration-200 text-left shadow-xs cursor-pointer active:scale-[0.98]"
          >
            <div className="space-y-0.5">
              <div className="text-base sm:text-lg font-normal text-[#424242]">{UI_TEXT.shunt.deposit.label}</div>
              <div className="text-xs sm:text-sm text-[#5E5E5E]">{UI_TEXT.shunt.deposit.desc}</div>
            </div>
            <Archive size={20} className="text-[#9E9E9E] group-hover:text-[#424242] transition-colors" />
          </button>

          <button 
            onClick={handleAction}
            className="group flex items-center justify-between px-5 sm:px-7 py-4 sm:py-5 bg-[#FFFFFF] border border-[#E0E0E0] hover:border-[#424242] rounded-2xl transition-all duration-200 text-left shadow-xs cursor-pointer active:scale-[0.98]"
          >
            <div className="space-y-0.5">
              <div className="text-base sm:text-lg font-normal text-[#424242]">{UI_TEXT.shunt.action.label}</div>
              <div className="text-xs sm:text-sm text-[#5E5E5E]">{UI_TEXT.shunt.action.desc}</div>
            </div>
            <ArrowRight size={20} className="text-[#9E9E9E] group-hover:text-[#424242] transition-colors" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};
