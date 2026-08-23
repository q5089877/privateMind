import React from 'react';
import { motion } from 'motion/react';
import { Archive, Eye } from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';
import { UI_TEXT } from '../config/textConfig';

interface DepositChoiceScreenProps {
  onDirectDeposit: () => void;
  onFourIts: () => void;
}

export const DepositChoiceScreen: React.FC<DepositChoiceScreenProps> = ({
  onDirectDeposit,
  onFourIts
}) => {
  return (
    <motion.div
      key="deposit-choice"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="w-full max-w-md space-y-6 text-center"
    >
      <h2 className="text-xl sm:text-2xl font-light text-[#424242] tracking-wide">
        {UI_TEXT.depositChoice.title}
      </h2>

      <div className="grid gap-3 sm:gap-4">
        <button
          onClick={() => { triggerHaptic(20); onDirectDeposit(); }}
          className="group flex items-center justify-between px-5 sm:px-7 py-4 sm:py-5 bg-[#FFFFFF] border border-[#E0E0E0] hover:border-[#424242] rounded-2xl transition-all duration-200 text-left shadow-xs cursor-pointer active:scale-[0.99]"
        >
          <div className="space-y-0.5 sm:space-y-1">
            <div className="text-base sm:text-lg font-normal text-[#424242]">{UI_TEXT.depositChoice.direct.label}</div>
            <div className="text-xs sm:text-sm text-[#5E5E5E]">{UI_TEXT.depositChoice.direct.desc}</div>
          </div>
          <Archive size={20} className="text-[#9E9E9E] group-hover:text-[#424242] transition-colors flex-shrink-0 ml-4" />
        </button>

        <button
          onClick={() => { triggerHaptic(20); onFourIts(); }}
          className="group flex items-center justify-between px-5 sm:px-7 py-4 sm:py-5 bg-[#FFFFFF] border border-[#E0E0E0] hover:border-[#424242] rounded-2xl transition-all duration-200 text-left shadow-xs cursor-pointer active:scale-[0.99]"
        >
          <div className="space-y-0.5 sm:space-y-1">
            <div className="text-base sm:text-lg font-normal text-[#424242]">{UI_TEXT.depositChoice.fourIts.label}</div>
            <div className="text-xs sm:text-sm text-[#5E5E5E]">{UI_TEXT.depositChoice.fourIts.desc}</div>
          </div>
          <Eye size={20} className="text-[#9E9E9E] group-hover:text-[#424242] transition-colors flex-shrink-0 ml-4" />
        </button>
      </div>
    </motion.div>
  );
};
