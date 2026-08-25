import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Leaf } from 'lucide-react';
import { Thought, ThoughtAddition } from '../types';
import { triggerHaptic } from '../utils/haptics';
import { UI_TEXT } from '../config/textConfig';
import { AdditionForm } from './AdditionForm';

interface ThoughtCardProps {
  thought: Thought;
  onDelete: () => void;
  onRelease: () => void;
  onUpdate: (t: Thought) => void;
  onAddAddition: (addition: ThoughtAddition) => void;
  onRemoveAddition: (additionId: string) => void;
}

export const ThoughtCard: React.FC<ThoughtCardProps> = ({ 
  thought, 
  onDelete, 
  onRelease,
  onUpdate, 
  onAddAddition,
  onRemoveAddition
}) => {
  const [confirmType, setConfirmType] = useState<'DELETE' | 'RELEASE' | null>(null);
  const [isAdditionsExpanded, setIsAdditionsExpanded] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  
  const isReleased = thought.currentDisposition === 'RELEASE' || thought.actionStep?.disposition === 'NOT_PROCESS';

  const handleConfirm = () => {
    if (confirmType === 'DELETE') {
      onDelete();
    } else if (confirmType === 'RELEASE') {
      onRelease();
    }
    setConfirmType(null);
  };

  let retentionText = '';
  if (thought.retentionUntil) {
    const d = new Date(thought.retentionUntil);
    retentionText = `${UI_TEXT.review.card.retentionPrefix}${d.getMonth() + 1} 月 ${d.getDate()} 日`;
  }

  return (
    <motion.div 
      layout
      className={`p-6 rounded-2xl bg-[#FFFFFF] border border-[#E0E0E0] transition-all duration-300 shadow-xs relative overflow-hidden`}
    >
      <AnimatePresence>
        {confirmType && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 bg-white/95 backdrop-blur-sm flex flex-col items-center justify-center space-y-4"
          >
            <p className="text-sm text-[#424242] font-light">
              {confirmType === 'DELETE' ? UI_TEXT.review.card.confirmDeleteTitle : UI_TEXT.review.card.confirmReleaseTitle}
            </p>
            <div className="flex gap-4">
              <button 
                onClick={() => setConfirmType(null)}
                className="px-5 py-1.5 text-xs rounded-full bg-[#EFEEEB] text-[#5E5E5E] hover:text-[#2C2C2C] transition-colors cursor-pointer"
              >
                {UI_TEXT.review.card.keepBtn}
              </button>
              <button 
                onClick={handleConfirm}
                className="px-5 py-1.5 text-xs rounded-full bg-[#E0E0E0] text-[#2C2C2C] hover:bg-[#D1D1CB] transition-colors cursor-pointer"
              >
                {confirmType === 'DELETE' ? UI_TEXT.review.card.deleteBtn : UI_TEXT.review.card.releaseBtn}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex justify-between items-start gap-4">
        <div className="space-y-1.5 flex-grow">
          <div className="text-xs text-[#A3A3A3] font-mono">
            {new Date(thought.createdAt).toLocaleString('zh-TW', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            {isReleased && <span className="ml-2">· {UI_TEXT.review.filters.RELEASED}</span>}
          </div>
          
          <ThoughtContent thought={thought} />

          {thought.actionStep && !isReleased && (
            <ActionInfo thought={thought} />
          )}

          {isReleased && (
            <div className="mt-4 pt-4 border-t border-[#E0E0E0]/50 space-y-4">
              <p className="text-sm text-[#737373] font-light text-center">{UI_TEXT.review.card.releasedSubtitle}</p>
              
              <div className="flex justify-center gap-3">
                <button className="px-5 py-1.5 text-xs rounded-full bg-[#F8F7F5] text-[#737373] hover:bg-[#EFEEEB] transition-colors cursor-default">
                  {UI_TEXT.review.card.keepReleasedBtn}
                </button>
                <button 
                  onClick={() => setConfirmType('DELETE')} 
                  className="px-5 py-1.5 text-xs rounded-full bg-[#F8F7F5] text-[#A3A3A3] hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                >
                  {UI_TEXT.review.card.deleteBtn}
                </button>
              </div>

              {retentionText && (
                <p className="text-xs text-[#A3A3A3] text-center font-light">{retentionText}</p>
              )}
            </div>
          )}

          {/* Additions List */}
          {thought.additions && thought.additions.length > 0 && (
            <div className="mt-4 pt-4 border-t border-[#E0E0E0]/50 space-y-3">
              <button 
                onClick={() => setIsAdditionsExpanded(!isAdditionsExpanded)}
                className="text-xs text-[#737373] hover:text-[#424242] transition-colors cursor-pointer flex items-center gap-1"
              >
                {isAdditionsExpanded ? '隱藏後來的念頭' : `後來又想到 ${thought.additions.length} 筆`}
                <span className="text-[10px] ml-1">{isAdditionsExpanded ? '▲' : '▼'}</span>
              </button>
              
              <AnimatePresence>
                {isAdditionsExpanded && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }} 
                    animate={{ opacity: 1, height: 'auto' }} 
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-4 overflow-hidden"
                  >
                    {thought.additions.map(add => (
                      <div key={add.id} className="pl-3 border-l-2 border-[#E0E0E0] space-y-1 relative group">
                        <button 
                          onClick={() => onRemoveAddition(add.id)}
                          className="absolute -right-2 top-0 p-1 opacity-0 group-hover:opacity-100 text-[#A3A3A3] hover:text-red-500 transition-all cursor-pointer"
                          title="刪除這筆痕跡"
                        >
                          ✕
                        </button>
                        <div className="text-[10px] text-[#A3A3A3] font-mono">
                          {new Date(add.createdAt).toLocaleString('zh-TW', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div className="text-sm font-light text-[#424242] whitespace-pre-wrap">{add.content}</div>
                        {add.actionStep && (
                          <div className="mt-1.5 p-2 bg-[#F8F7F5] rounded-lg text-xs">
                            <span className="font-medium text-[#737373] mr-2">[{getDispositionLabel(add.actionStep.disposition)}]</span>
                            <span className="text-[#5E5E5E]">{add.actionStep.text}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Add Addition Form */}
          <div className="mt-4 pt-2">
            {!isAdding ? (
              <button 
                onClick={() => setIsAdding(true)}
                className="text-xs text-[#A3A3A3] hover:text-[#5E5E5E] transition-colors cursor-pointer"
              >
                {UI_TEXT.addition.addBtn}
              </button>
            ) : (
              <AdditionForm 
                onSave={(addition) => {
                  onAddAddition(addition);
                  setIsAdding(false);
                  setIsAdditionsExpanded(true);
                }}
                onCancel={() => setIsAdding(false)}
              />
            )}
          </div>

        </div>

        <div className="flex flex-col gap-2 pt-1">
          {!isReleased && (
            <button 
              onClick={() => setConfirmType('RELEASE')} 
              className="p-1.5 w-8 h-8 flex items-center justify-center text-[#A3A3A3] hover:text-[#424242] cursor-pointer bg-[#F8F7F5] hover:bg-[#EFEEEB] rounded-lg transition-colors" 
              title={UI_TEXT.review.card.releaseBtn}
            >
              <Leaf size={18} />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

const getDispositionLabel = (disp?: string) => {
  switch (disp) {
    case 'SELF': return UI_TEXT.action.dispositions.SELF.label;
    case 'TOGETHER': return UI_TEXT.action.dispositions.TOGETHER.label;
    case 'CANNOT_NOW': return UI_TEXT.action.dispositions.CANNOT_NOW.label;
    case 'NOT_PROCESS': return UI_TEXT.action.dispositions.NOT_PROCESS.label;
    default: return UI_TEXT.review.card.pastSteps;
  }
};

const ThoughtContent: React.FC<{ thought: Thought }> = ({ thought }) => {
  if (thought.awarenessOnly) {
    return <div className="text-[#5E5E5E] italic font-light">{UI_TEXT.review.card.awareness}</div>;
  }

  return (
    <div className={`text-lg font-light leading-relaxed whitespace-pre-wrap text-[#424242]`}>
      {thought.content}
    </div>
  );
};

const ActionInfo: React.FC<{ thought: Thought }> = ({ thought }) => {
  const displayTag = getDispositionLabel(thought.actionStep?.disposition || undefined);

  return (
    <div className="mt-3 space-y-3">
      <div className="p-3.5 rounded-xl border bg-[#FDFDFB] border-[#E0E0E0] shadow-sm transition-all">
        <div className="flex items-center gap-2 mb-2">
          <div className="text-xs text-[#A3A3A3] tracking-widest font-semibold uppercase">
            {displayTag}
          </div>
          {thought.actionStep?.person && (
            <div className="text-[10px] bg-[#EFEEEB] text-[#5E5E5E] px-1.5 py-0.5 rounded font-medium">
              {UI_TEXT.review.card.assigneePrefix}{thought.actionStep.person}
            </div>
          )}
        </div>
        
        <div className="flex items-start gap-2.5">
          <div className="text-[#424242] font-normal text-[17px] leading-relaxed">
            {thought.actionStep?.text || thought.content}
          </div>
        </div>

        {thought.actionStep?.scheduledAt && (
          <div className="text-sm text-[#5E5E5E] mt-2.5 p-2.5 bg-white/50 rounded-lg border border-[#EFEEEB] italic">
            {thought.actionStep.scheduledAt}
          </div>
        )}
      </div>
    </div>
  );
};
