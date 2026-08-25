import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ThoughtAddition } from '../types';
import { UI_TEXT } from '../config/textConfig';
import { triggerHaptic } from '../utils/haptics';

interface AdditionFormProps {
  onSave: (addition: ThoughtAddition) => void;
  onCancel: () => void;
}

type AddPhase = 'TEXT' | 'PROMPT_ACTION' | 'STEP_TEXT' | 'DISPOSITION';

export const AdditionForm: React.FC<AdditionFormProps> = ({ onSave, onCancel }) => {
  const [phase, setPhase] = useState<AddPhase>('TEXT');
  const [content, setContent] = useState('');
  const [stepText, setStepText] = useState('');

  const generateId = () => {
    return typeof crypto !== 'undefined' && crypto.randomUUID 
      ? crypto.randomUUID() 
      : `add-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  };

  const handleFinishDeposit = () => {
    triggerHaptic(20);
    onSave({
      id: generateId(),
      content: content.trim(),
      createdAt: Date.now()
    });
  };

  const handleFinishAction = (disposition: 'SELF' | 'TOGETHER' | 'CANNOT_NOW') => {
    triggerHaptic([30, 40]);
    onSave({
      id: generateId(),
      content: content.trim(),
      createdAt: Date.now(),
      actionStep: {
        text: stepText.trim() || content.trim(),
        disposition
      }
    });
  };

  return (
    <div className="mt-4 p-4 rounded-xl border border-dashed border-[#D1D1CB] bg-[#FDFDFB] overflow-hidden">
      <AnimatePresence mode="wait">
        {phase === 'TEXT' && (
          <motion.div 
            key="TEXT"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <textarea
              autoFocus
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={UI_TEXT.addition.inputPlaceholder}
              className="w-full bg-transparent border-b border-[#E0E0E0] focus:border-[#424242] text-[#424242] placeholder:text-[#9E9E9E] font-light outline-none resize-none min-h-[60px]"
            />
            <div className="flex justify-end gap-3">
              <button onClick={onCancel} className="text-xs text-[#A3A3A3] hover:text-[#5E5E5E] transition-colors cursor-pointer px-3 py-1.5">
                {UI_TEXT.addition.cancelBtn}
              </button>
              <button 
                disabled={!content.trim()}
                onClick={() => { triggerHaptic(10); setPhase('PROMPT_ACTION'); }}
                className="px-4 py-1.5 text-xs rounded-full bg-[#424242] text-[#FDFDFD] disabled:opacity-50 transition-all cursor-pointer"
              >
                {UI_TEXT.addition.saveBtn}
              </button>
            </div>
          </motion.div>
        )}

        {phase === 'PROMPT_ACTION' && (
          <motion.div 
            key="PROMPT_ACTION"
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            className="space-y-4 text-center py-2"
          >
            <p className="text-sm text-[#424242] font-medium">{UI_TEXT.addition.promptAction}</p>
            <div className="flex justify-center gap-3">
              <button 
                onClick={handleFinishDeposit}
                className="px-5 py-2 rounded-full border border-[#E0E0E0] text-[#5E5E5E] hover:border-[#424242] hover:text-[#424242] transition-colors text-sm cursor-pointer"
              >
                {UI_TEXT.addition.optionDeposit}
              </button>
              <button 
                onClick={() => { triggerHaptic(10); setPhase('STEP_TEXT'); }}
                className="px-5 py-2 rounded-full border border-[#424242] bg-[#424242] text-[#FDFDFD] hover:bg-black transition-colors text-sm cursor-pointer"
              >
                {UI_TEXT.addition.optionAction}
              </button>
            </div>
          </motion.div>
        )}

        {phase === 'STEP_TEXT' && (
          <motion.div 
            key="STEP_TEXT"
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <p className="text-sm text-[#424242] font-medium text-center">{UI_TEXT.addition.actionPlaceholder}</p>
            <textarea
              autoFocus
              value={stepText}
              onChange={(e) => setStepText(e.target.value)}
              placeholder="可以留空，代表上述念頭即為步驟"
              className="w-full bg-transparent border-b border-[#E0E0E0] focus:border-[#424242] text-[#424242] placeholder:text-[#9E9E9E] font-light outline-none resize-none min-h-[60px]"
            />
            <div className="flex justify-end">
              <button 
                onClick={() => { triggerHaptic(10); setPhase('DISPOSITION'); }}
                className="px-4 py-1.5 text-xs rounded-full bg-[#424242] text-[#FDFDFD] transition-all cursor-pointer"
              >
                下一步
              </button>
            </div>
          </motion.div>
        )}

        {phase === 'DISPOSITION' && (
          <motion.div 
            key="DISPOSITION"
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            className="space-y-4 text-center py-2"
          >
            <p className="text-sm text-[#424242] font-medium">{UI_TEXT.addition.howToDoPrompt}</p>
            <div className="flex flex-wrap justify-center gap-2">
              <button 
                onClick={() => handleFinishAction('SELF')}
                className="px-4 py-2 rounded-full border border-[#E0E0E0] bg-white text-[#5E5E5E] hover:border-[#424242] hover:text-[#424242] transition-colors text-xs sm:text-sm cursor-pointer shadow-xs"
              >
                自己做
              </button>
              <button 
                onClick={() => handleFinishAction('TOGETHER')}
                className="px-4 py-2 rounded-full border border-[#E0E0E0] bg-white text-[#5E5E5E] hover:border-[#424242] hover:text-[#424242] transition-colors text-xs sm:text-sm cursor-pointer shadow-xs"
              >
                找人一起做
              </button>
              <button 
                onClick={() => handleFinishAction('CANNOT_NOW')}
                className="px-4 py-2 rounded-full border border-[#E0E0E0] bg-white text-[#5E5E5E] hover:border-[#424242] hover:text-[#424242] transition-colors text-xs sm:text-sm cursor-pointer shadow-xs"
              >
                現在還做不到
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
