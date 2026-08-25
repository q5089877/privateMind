import React, { useState } from 'react';
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
  const [isDepositing, setIsDepositing] = useState(false);

  const handleDeposit = () => {
    if (isDepositing) return;
    triggerHaptic([20, 30]);
    setIsDepositing(true);

    // 觸覺微震（在沉降過半約 900ms 時給予著陸感知）
    setTimeout(() => {
      triggerHaptic([15, 20]);
    }, 900);

    // 完整的 1.8 秒深層安撫下沉儀式
    setTimeout(() => {
      onChooseDeposit();
    }, 1800);
  };

  const handleAction = () => {
    if (isDepositing) return;
    triggerHaptic(20);
    onChooseAction();
  };

  return (
    <div className="w-full max-w-lg space-y-6 sm:space-y-8 py-4 sm:py-6 flex flex-col items-center justify-center text-center">
      {/* 標題區（點擊先放著時，柔和變為「看見了。」） */}
      <div className="min-h-[40px] flex items-center justify-center">
        <motion.p
          key={isDepositing ? 'settled' : 'question'}
          initial={{ opacity: 0, y: isDepositing ? -8 : 0 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.0, ease: [0.25, 1, 0.5, 1] }}
          className={`font-light text-[#424242] tracking-wide ${
            isDepositing ? 'text-2xl sm:text-3xl' : 'text-xl sm:text-2xl'
          }`}
        >
          {isDepositing ? UI_TEXT.completion.ceremony.deposit : UI_TEXT.shunt.title}
        </motion.p>
      </div>

      {/* 念頭卡片（點擊先放著時，原地 1.8 秒深層緩慢向下沉降 40px 並柔化陰影） */}
      <motion.div
        animate={
          isDepositing 
            ? { 
                y: 40, 
                backgroundColor: '#FAF9F6',
                borderColor: '#E8E8E4',
                boxShadow: "0 14px 36px -6px rgba(0, 0, 0, 0.08)"
              } 
            : { 
                y: 0, 
                backgroundColor: '#FFFFFF',
                borderColor: '#E0E0E0',
                boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.04)"
              }
        }
        transition={{ 
          duration: 1.8, 
          ease: [0.25, 1, 0.5, 1] 
        }}
        className="w-full p-6 sm:p-7 rounded-2xl border text-left space-y-3 will-change-transform"
      >
        <div className="text-xs text-[#A3A3A3] font-mono">
          {new Date().toLocaleString('zh-TW', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </div>
        <div className="text-lg sm:text-xl font-light leading-relaxed text-[#424242] whitespace-pre-wrap">
          {thoughtContent || ''}
        </div>
      </motion.div>

      {/* 分流按鈕區（點擊先放著時，按鈕向下滑落融化淡出） */}
      <motion.div 
        animate={
          isDepositing 
            ? { opacity: 0, y: 36, pointerEvents: 'none' } 
            : { opacity: 1, y: 0, pointerEvents: 'auto' }
        }
        transition={{ 
          duration: 0.8, 
          ease: [0.25, 1, 0.5, 1] 
        }}
        className="w-full space-y-4 pt-1"
      >
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
      </motion.div>
    </div>
  );
};
