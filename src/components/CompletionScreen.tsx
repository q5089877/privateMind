
import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { triggerHaptic } from '../utils/haptics';

interface CompletionScreenProps {
  type: 'AWARENESS' | 'DEPOSIT' | 'ACTION';
  actionCategory?: string;
  retentionUntil?: number | null;
  onReset: () => void;
}

export const CompletionScreen: React.FC<CompletionScreenProps> = ({ type, actionCategory, retentionUntil, onReset }) => {
  const [isSettled, setIsSettled] = useState(false);

  // 儀式時間：1.0 秒落座結束觸發震動反饋
  useEffect(() => {
    triggerHaptic(10);

    const timer = setTimeout(() => {
      setIsSettled(true);
      triggerHaptic(15);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const getCeremonyConfig = () => {
    // 1. 一般安放／說不上來 -> 落座
    if (type === 'AWARENESS' || type === 'DEPOSIT') {
      return {
        initial: { y: -20, scale: 1, opacity: 0 },
        animate: { y: 20, scale: 0.85, opacity: 0.75 },
        text: '看見了。',
        transition: { duration: 1.0, ease: [0.22, 1, 0.36, 1] }
      };
    }

    // 2. A／B 行動 -> 停落
    if (actionCategory === 'A' || actionCategory === 'B') {
      return {
        initial: { y: -10, opacity: 0 },
        animate: { y: 0, opacity: 1 },
        text: '記下了。',
        transition: { duration: 0.8, ease: "easeOut" }
      };
    }

    // 3. C 類 (現在還做不到) -> 淡入輪廓
    if (actionCategory === 'C') {
      return {
        initial: { opacity: 0 },
        animate: { opacity: 0.45 },
        text: '先放在這裡。',
        transition: { duration: 1.2, ease: "easeInOut" }
      };
    }

    // 4. D 類 (我先不處理) -> 散開消失
    if (actionCategory === 'D') {
      return {
        initial: { scale: 1, opacity: 1, filter: 'blur(0px)' },
        animate: { scale: 1.2, opacity: 0, filter: 'blur(8px)' },
        text: '放下了。',
        transition: { duration: 1.2, ease: "easeOut" }
      };
    }

    return {
      initial: { y: 0, opacity: 0 },
      animate: { y: 0, opacity: 1 },
      text: '記下了。',
      transition: { duration: 0.8 }
    };
  };

  const config = getCeremonyConfig();

  const getRetentionText = () => {
    if (type !== 'DEPOSIT') return null;
    if (retentionUntil === null) return '內容已為你永久保留';
    if (retentionUntil === undefined) return null;
    
    const diff = retentionUntil - Date.now();
    if (isNaN(diff)) return null;

    const days = Math.round(diff / (24 * 60 * 60 * 1000));
    if (days <= 0) return '內容僅作即時覺察，不作保留';
    return `內容已為你保留 ${days} 天`;
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="text-center space-y-6 sm:space-y-10 py-6 sm:py-10 flex flex-col items-center justify-center min-h-[220px] sm:min-h-[300px]"
    >
      <div className="space-y-6 sm:space-y-8">
        {/* 文字呈現：遵循落座、停落、淡入、散開的物理規律 */}
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

        {/* 僅限安放路徑的誠實留存提示 */}
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
      
      {/* 儀式完成後，平靜浮現的返回首頁出口 */}
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
          返回首頁
        </button>
      </motion.div>
    </motion.div>
  );
};


