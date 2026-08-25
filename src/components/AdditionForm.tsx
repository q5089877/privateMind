import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ThoughtAddition } from '../types';
import { UI_TEXT } from '../config/textConfig';
import { triggerHaptic } from '../utils/haptics';

interface AdditionFormProps {
  onSave: (addition: ThoughtAddition) => void;
  onCancel: () => void;
}

type AddPhase = 'TEXT' | 'PROMPT_ACTION' | 'STEP_TEXT';

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

  const handleFinishAction = () => {
    triggerHaptic([30, 40]);
    onSave({
      id: generateId(),
      content: content.trim(),
      createdAt: Date.now(),
      actionStep: {
        text: stepText.trim() || content.trim()
      }
    });
  };

  return (
    <div className="mt-4 p-4 sm:p-5 rounded-2xl border border-dashed border-[#D1D1CB] bg-[#FDFDFB] overflow-hidden">
      <AnimatePresence mode="wait">
        {phase === 'TEXT' && (
          <motion.div 
            key="TEXT"
            initial={{ opacity: 0, y: 8 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: -8 }}
            className="space-y-4"
          >
            <textarea
              autoFocus
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={UI_TEXT.addition.inputPlaceholder}
              className="w-full bg-transparent border-b border-[#E0E0E0] focus:border-[#424242] text-[#424242] placeholder:text-[#9E9E9E] font-light outline-none resize-none min-h-[60px]"
            />
            <div className="flex justify-end gap-3 items-center">
              <button 
                type="button"
                onClick={onCancel} 
                className="text-xs text-[#A3A3A3] hover:text-[#5E5E5E] transition-colors cursor-pointer px-3 py-1.5"
              >
                {UI_TEXT.addition.cancelBtn}
              </button>
              <button 
                type="button"
                disabled={!content.trim()}
                onClick={() => { triggerHaptic(10); setPhase('PROMPT_ACTION'); }}
                className="px-5 py-1.5 text-xs rounded-full bg-[#424242] text-[#FDFDFD] disabled:opacity-40 transition-all cursor-pointer active:scale-98"
              >
                繼續
              </button>
            </div>
          </motion.div>
        )}

        {phase === 'PROMPT_ACTION' && (
          <motion.div 
            key="PROMPT_ACTION"
            initial={{ opacity: 0, x: 16 }} 
            animate={{ opacity: 1, x: 0 }} 
            exit={{ opacity: 0, x: -16 }}
            className="space-y-4 text-center py-2"
          >
            <p className="text-sm font-light text-[#424242]">{UI_TEXT.addition.promptAction}</p>
            <div className="flex justify-center gap-3">
              <button 
                type="button"
                onClick={handleFinishDeposit}
                className="px-5 py-2 rounded-full border border-[#E0E0E0] text-[#5E5E5E] hover:border-[#424242] hover:text-[#424242] transition-colors text-sm cursor-pointer active:scale-98"
              >
                {UI_TEXT.addition.optionDeposit}
              </button>
              <button 
                type="button"
                onClick={() => { triggerHaptic(10); setPhase('STEP_TEXT'); }}
                className="px-5 py-2 rounded-full border border-[#424242] bg-[#424242] text-[#FDFDFD] hover:bg-black transition-colors text-sm cursor-pointer active:scale-98"
              >
                {UI_TEXT.addition.optionAction}
              </button>
            </div>
          </motion.div>
        )}

        {phase === 'STEP_TEXT' && (
          <motion.div 
            key="STEP_TEXT"
            initial={{ opacity: 0, x: 16 }} 
            animate={{ opacity: 1, x: 0 }} 
            exit={{ opacity: 0, x: -16 }}
            className="space-y-4 text-center"
          >
            <p className="text-sm font-light text-[#424242]">{UI_TEXT.addition.actionTitle}</p>
            <textarea
              autoFocus
              value={stepText}
              onChange={(e) => setStepText(e.target.value)}
              placeholder={UI_TEXT.addition.actionPlaceholder}
              className="w-full bg-transparent border-b border-[#E0E0E0] focus:border-[#424242] text-[#424242] placeholder:text-[#9E9E9E] font-light text-center outline-none resize-none min-h-[60px]"
            />
            <div className="flex justify-end gap-3 pt-2">
              <button 
                type="button"
                onClick={handleFinishAction}
                className="px-6 py-2 text-xs sm:text-sm rounded-full bg-[#424242] text-[#FDFDFD] hover:bg-black transition-all cursor-pointer active:scale-98"
              >
                {UI_TEXT.addition.saveBtn}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
