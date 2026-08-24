import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { triggerHaptic } from '../utils/haptics';
import { UI_TEXT } from '../config/textConfig';
import { ThoughtDisposition, ActionDisposition } from '../types';

interface CompletionScreenProps {
  type: ThoughtDisposition;
  actionDisposition?: ActionDisposition | null;
  awarenessOnly?: boolean;
  retentionUntil?: number | null;
  onReset: () => void;
}

export const CompletionScreen: React.FC<CompletionScreenProps> = ({ type, actionDisposition, awarenessOnly, retentionUntil, onReset }) => {
  const [isSettled, setIsSettled] = useState(false);

  useEffect(() => {
    triggerHaptic(10);

    const timer = setTimeout(() => {
      setIsSettled(true);
      triggerHaptic(15);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const getCeremonyConfig = () => {
    if (awarenessOnly || type === 'RELEASE' || type === 'DEPOSIT') {
      return {
        initial: { y: -20, scale: 1, opacity: 0 },
        animate: { y: 20, scale: 0.85, opacity: 0.75 },
        text: UI_TEXT.completion.ceremony.awareness,
        transition: { duration: 1.0, ease: [0.22, 1, 0.36, 1] }
      };
    }

    if (actionDisposition === 'SELF' || actionDisposition === 'TOGETHER') {
      return {
        initial: { y: -10, opacity: 0 },
        animate: { y: 0, opacity: 1 },
        text: UI_TEXT.completion.ceremony.action,
        transition: { duration: 0.8, ease: "easeOut" }
      };
    }

    if (actionDisposition === 'CANNOT_NOW') {
      return {
        initial: { opacity: 0 },
        animate: { opacity: 0.45 },
        text: UI_TEXT.completion.ceremony.cannotDo,
        transition: { duration: 1.2, ease: "easeInOut" }
      };
    }

    if (actionDisposition === 'NOT_PROCESS') {
      return {
        initial: { scale: 1, opacity: 1, filter: 'blur(0px)' },
        animate: { scale: 1.2, opacity: 0, filter: 'blur(8px)' },
        text: UI_TEXT.completion.ceremony.drop,
        transition: { duration: 1.2, ease: "easeOut" }
      };
    }

    return {
      initial: { y: 0, opacity: 0 },
      animate: { y: 0, opacity: 1 },
      text: UI_TEXT.completion.ceremony.action,
      transition: { duration: 0.8 }
    };
  };

  const config = getCeremonyConfig();

  const getRetentionText = () => {
    if (type !== 'DEPOSIT') return null;
    if (retentionUntil === null) return UI_TEXT.completion.retention.permanent;
    if (retentionUntil === undefined) return null;
    
    const diff = retentionUntil - Date.now();
    if (isNaN(diff)) return null;

    const days = Math.round(diff / (24 * 60 * 60 * 1000));
    if (days <= 0) return UI_TEXT.completion.retention.awarenessOnly;
    return `${UI_TEXT.completion.retention.daysPrefix}${days}${UI_TEXT.completion.retention.daysSuffix}`;
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="text-center space-y-6 sm:space-y-10 py-6 sm:py-10 flex flex-col items-center justify-center min-h-[220px] sm:min-h-[300px]"
    >
      <div className="space-y-6 sm:space-y-8">
        <div className="min-h-[60px] flex items-center justify-center">
          <motion.p 
            initial={config.initial}
            animate={config.animate}
            transition={config.transition}
            className="text-[24px] sm:text-[28px] font-normal leading-[1.8] text-center text-[#424242]"
          >
            {config.text}
          </motion.p>
        </div>

        {type === 'DEPOSIT' && (
          <motion.p
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.8 }}
            className="text-[13px] sm:text-[15px] tracking-[0.2em] text-[#737373] font-light"
          >
            {getRetentionText()}
          </motion.p>
        )}
      </div>
      
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: isSettled ? 1 : 0 }}
        transition={{ duration: 0.5 }}
        className="pt-3 sm:pt-6"
      >
        <button 
          onClick={onReset}
          className="px-8 sm:px-10 py-2.5 sm:py-3 text-[16px] sm:text-[19px] font-normal text-[#5E5E5E] hover:text-[#424242] hover:bg-[#EFEEEB] rounded-full transition-all duration-200 cursor-pointer active:scale-98"
        >
          {UI_TEXT.completion.backHome}
        </button>
      </motion.div>
    </motion.div>
  );
};
