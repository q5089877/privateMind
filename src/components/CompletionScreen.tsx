import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { triggerHaptic } from '../utils/haptics';
import { UI_TEXT } from '../config/textConfig';
import { Thought, ThoughtAddition } from '../types';
import { AdditionForm } from './AdditionForm';

interface CompletionScreenProps {
  thought: Partial<Thought>;
  onReset: () => void;
  onReview: () => void;
  onAddAddition: (addition: ThoughtAddition) => void;
}

export const CompletionScreen: React.FC<CompletionScreenProps> = ({ 
  thought, 
  onReset, 
  onReview, 
  onAddAddition 
}) => {
  const [isAdding, setIsAdding] = useState(false);

  const isDeposit = thought.currentDisposition === 'DEPOSIT' || thought.awarenessOnly;
  const ceremonyText = isDeposit ? UI_TEXT.completion.ceremony.deposit : UI_TEXT.completion.ceremony.action;

  return (
    <div className="w-full max-w-lg space-y-6 sm:space-y-8 flex flex-col items-center text-center">
      {/* 沉降定格字樣 */}
      <div className="min-h-[40px] flex items-center justify-center">
        <p className="text-2xl sm:text-3xl font-light text-[#424242] tracking-wide">
          {ceremonyText}
        </p>
      </div>

      {/* 已原地安放落座的念頭卡片（與沉降後位置高度完全一致，0px 跳動） */}
      <div 
        style={{ transform: 'translateY(36px)' }}
        className="w-full p-6 sm:p-7 rounded-2xl bg-[#FAF9F6] border border-[#E8E8E4] shadow-sm text-left space-y-4 will-change-transform"
      >
        <div className="text-xs text-[#A3A3A3] font-mono">
          {new Date(thought.createdAt || Date.now()).toLocaleString('zh-TW', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </div>

        <div className="text-lg sm:text-xl font-light leading-relaxed text-[#424242] whitespace-pre-wrap">
          {thought.awarenessOnly ? UI_TEXT.review.card.awareness : thought.content}
        </div>

        {thought.actionStep?.text && (
          <div className="p-3.5 bg-white/70 rounded-xl border border-[#E0E0E0] space-y-1">
            <div className="text-xs text-[#9E9E9E] font-medium">下一步</div>
            <div className="text-sm sm:text-base font-normal text-[#424242]">
              {thought.actionStep.text}
            </div>
          </div>
        )}

        {/* 顯示後來的 Additions (若有) */}
        {thought.additions && thought.additions.length > 0 && (
          <div className="pt-3 border-t border-[#E0E0E0]/60 space-y-3">
            <div className="text-xs text-[#9E9E9E]">後來又想到 {thought.additions.length} 筆：</div>
            <div className="space-y-2">
              {thought.additions.map(add => (
                <div key={add.id} className="pl-3 border-l-2 border-[#D1D1CB] text-sm text-[#5E5E5E] space-y-1">
                  <div>{add.content}</div>
                  {add.actionStep?.text && (
                    <div className="text-xs text-[#737373] bg-white/70 p-1.5 rounded">
                      下一步：{add.actionStep.text}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 停靠時直接續寫 Addition */}
        <AnimatePresence>
          {isAdding && (
            <div className="pt-2">
              <AdditionForm 
                onSave={(addition) => {
                  onAddAddition(addition);
                  setIsAdding(false);
                }}
                onCancel={() => setIsAdding(false)}
              />
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* 底部安靜出口 */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.8 }}
        style={{ transform: 'translateY(36px)' }}
        className="w-full flex flex-col items-center gap-3 pt-2"
      >
        {!isAdding && (
          <button 
            type="button"
            onClick={() => {
              triggerHaptic(15);
              setIsAdding(true);
            }}
            className="text-sm sm:text-base text-[#424242] hover:text-black font-light py-2 px-5 rounded-full hover:bg-[#EFEEEB] transition-colors cursor-pointer active:scale-98"
          >
            {UI_TEXT.completion.exits.addAddition}
          </button>
        )}

        <div className="flex items-center gap-4 text-xs sm:text-sm text-[#9E9E9E]">
          <button 
            type="button"
            onClick={() => {
              triggerHaptic(15);
              onReview();
            }}
            className="hover:text-[#424242] transition-colors py-1 cursor-pointer"
          >
            {UI_TEXT.completion.exits.reviewPast}
          </button>
          <div className="w-[1px] h-3 bg-[#E0E0E0]"></div>
          <button 
            type="button"
            onClick={() => {
              triggerHaptic(15);
              onReset();
            }}
            className="hover:text-[#424242] transition-colors py-1 cursor-pointer"
          >
            {UI_TEXT.completion.exits.backHome}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
