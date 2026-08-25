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
    triggerHaptic([25, 35]);
    setIsDepositing(true);

    // 觸覺微震（在沉降過半約 1000ms 時給予著陸感知）
    setTimeout(() => {
      triggerHaptic([15, 20]);
    }, 1000);

    // 完整 2.0 秒深層安撫沉降
    setTimeout(() => {
      onChooseDeposit();
    }, 2000);
  };

  const handleAction = () => {
    if (isDepositing) return;
    triggerHaptic(20);
    onChooseAction();
  };

  return (
    <div className="w-full max-w-lg space-y-6 sm:space-y-8 flex flex-col items-center text-center">
      {/* 標題區（點擊先放著時，柔和變為「看見了。」） */}
      <div className="min-h-[40px] flex items-center justify-center">
        <motion.p
          key={isDepositing ? 'settled' : 'question'}
          initial={{ opacity: 0, y: isDepositing ? -8 : 0 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, ease: [0.25, 1, 0.5, 1] }}
          className={`font-light text-ink tracking-wide ${
            isDepositing ? 'text-2xl sm:text-3xl' : 'text-xl sm:text-2xl'
          }`}
        >
          {isDepositing ? UI_TEXT.completion.ceremony.deposit : UI_TEXT.shunt.title}
        </motion.p>
      </div>

      {/* 念頭卡片（點擊先放著時，原地 2.0 秒深層緩慢向下沉降 36px 並加深陰影） */}
      <motion.div
        animate={
          isDepositing 
            ? { 
                y: 36, 
                backgroundColor: 'var(--surface-subtle)',
                borderColor: 'var(--border-base)',
                boxShadow: "0 14px 36px -6px rgba(28, 39, 32, 0.08)"
              } 
            : { 
                y: 0, 
                backgroundColor: 'var(--surface)',
                borderColor: 'var(--border-base)',
                boxShadow: "0 1px 3px 0 rgba(28, 39, 32, 0.04)"
              }
        }
        transition={{ 
          duration: 2.0, 
          ease: [0.25, 1, 0.5, 1] 
        }}
        className="w-full p-6 sm:p-7 rounded-2xl border text-left space-y-3 will-change-transform"
      >
        <div className="text-xs text-ink-muted font-mono">
          {new Date().toLocaleString('zh-TW', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </div>
        <div className="text-lg sm:text-xl font-light leading-relaxed text-ink whitespace-pre-wrap">
          {thoughtContent || ''}
        </div>
      </motion.div>

      {/* 分流按鈕區（點擊先放著時，按鈕向下平緩融化淡出） */}
      <motion.div 
        animate={
          isDepositing 
            ? { opacity: 0, y: 28, pointerEvents: 'none' } 
            : { opacity: 1, y: 0, pointerEvents: 'auto' }
        }
        transition={{ 
          duration: 1.0, 
          ease: [0.25, 1, 0.5, 1] 
        }}
        className="w-full space-y-4 pt-1"
      >
        <div className="grid gap-3 sm:gap-4">
          <button 
            onClick={handleDeposit}
            className="group flex items-center justify-between px-5 sm:px-7 py-4 sm:py-5 bg-surface border border-border-base hover:border-border-focus rounded-2xl transition-all duration-200 text-left shadow-xs cursor-pointer active:scale-[0.98]"
          >
            <div className="space-y-0.5">
              <div className="text-base sm:text-lg font-normal text-ink">{UI_TEXT.shunt.deposit.label}</div>
              <div className="text-xs sm:text-sm text-ink-secondary">{UI_TEXT.shunt.deposit.desc}</div>
            </div>
            <Archive size={20} className="text-ink-muted group-hover:text-ink transition-colors" />
          </button>

          <button 
            onClick={handleAction}
            className="group flex items-center justify-between px-5 sm:px-7 py-4 sm:py-5 bg-surface border border-border-base hover:border-border-focus rounded-2xl transition-all duration-200 text-left shadow-xs cursor-pointer active:scale-[0.98]"
          >
            <div className="space-y-0.5">
              <div className="text-base sm:text-lg font-normal text-ink">{UI_TEXT.shunt.action.label}</div>
              <div className="text-xs sm:text-sm text-ink-secondary">{UI_TEXT.shunt.action.desc}</div>
            </div>
            <ArrowRight size={20} className="text-ink-muted group-hover:text-ink transition-colors" />
          </button>
        </div>
      </motion.div>
    </div>
  );
};
