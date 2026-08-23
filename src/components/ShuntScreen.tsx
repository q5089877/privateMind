import React from 'react';
import { motion } from 'motion/react';
import { Archive, ArrowRight } from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';
import { UI_TEXT } from '../config/textConfig';

interface ShuntScreenProps {
  onChooseDeposit: () => void;
  onChooseAction: () => void;
}

export const ShuntScreen: React.FC<ShuntScreenProps> = ({ onChooseDeposit, onChooseAction }) => {
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
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="w-full max-w-md space-y-6 sm:space-y-10 text-center"
    >
      <h2 className="text-xl sm:text-3xl font-light text-[#424242] tracking-wide">
        {UI_TEXT.shunt.title}
      </h2>
      
      <div className="grid gap-3 sm:gap-5">
        <button 
          onClick={handleDeposit}
          className="group flex items-center justify-between px-5 sm:px-7 py-3.5 sm:py-5 bg-[#FFFFFF] border border-[#E0E0E0] hover:border-[#424242] rounded-2xl transition-all duration-200 text-left shadow-xs cursor-pointer active:scale-[0.99]"
        >
          <div className="space-y-0.5 sm:space-y-1">
            <div className="text-base sm:text-lg font-normal text-[#424242]">{UI_TEXT.shunt.deposit.label}</div>
            <div className="text-xs sm:text-sm text-[#5E5E5E]">{UI_TEXT.shunt.deposit.desc}</div>
          </div>
          <Archive size={20} className="text-[#9E9E9E] group-hover:text-[#424242] transition-colors" />
        </button>

        <button 
          onClick={handleAction}
          className="group flex items-center justify-between px-5 sm:px-7 py-3.5 sm:py-5 bg-[#FFFFFF] border border-[#E0E0E0] hover:border-[#424242] rounded-2xl transition-all duration-200 text-left shadow-xs cursor-pointer active:scale-[0.99]"
        >
          <div className="space-y-0.5 sm:space-y-1">
            <div className="text-base sm:text-lg font-normal text-[#424242]">{UI_TEXT.shunt.action.label}</div>
            <div className="text-xs sm:text-sm text-[#5E5E5E]">{UI_TEXT.shunt.action.desc}</div>
          </div>
          <ArrowRight size={20} className="text-[#9E9E9E] group-hover:text-[#424242] transition-colors" />
        </button>
      </div>
    </motion.div>
  );
};
