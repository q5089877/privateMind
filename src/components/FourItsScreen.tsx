import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { triggerHaptic } from '../utils/haptics';
import { UI_TEXT } from '../config/textConfig';

interface FourItsScreenProps {
  onComplete: () => void;
}

export const FourItsScreen: React.FC<FourItsScreenProps> = ({ onComplete }) => {
  const [stepIndex, setStepIndex] = useState(0);
  const steps = UI_TEXT.fourIts.steps;
  const current = steps[stepIndex];
  const isLast = stepIndex === steps.length - 1;

  const handleNext = () => {
    triggerHaptic(20);
    if (isLast) {
      onComplete();
    } else {
      setStepIndex(i => i + 1);
    }
  };

  return (
    <div className="w-full max-w-md flex flex-col items-center text-center space-y-10">
      {/* 步驟指示點 */}
      <div className="flex gap-2">
        {steps.map((_, i) => (
          <div
            key={i}
            className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
              i === stepIndex ? 'bg-[#424242] w-4' : i < stepIndex ? 'bg-[#424242]/40' : 'bg-[#E0E0E0]'
            }`}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={stepIndex}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="space-y-4"
        >
          <h2 className="text-2xl sm:text-3xl font-light text-[#424242] tracking-wide">
            {current.label}
          </h2>
          <p className="text-sm sm:text-base text-[#737373] font-light leading-relaxed">
            {current.desc}
          </p>
        </motion.div>
      </AnimatePresence>

      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={handleNext}
        className="px-10 py-3 bg-[#424242] text-[#F8F7F5] rounded-full text-[17px] sm:text-[19px] font-normal tracking-wide transition-all duration-200 cursor-pointer hover:bg-[#2C2C2C]"
      >
        {isLast ? UI_TEXT.fourIts.finalBtn : UI_TEXT.fourIts.nextBtn}
      </motion.button>
    </div>
  );
};
