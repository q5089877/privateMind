
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Leaf, CheckCircle2, RotateCcw } from 'lucide-react';
import { Thought } from '../types';
import { triggerHaptic } from '../utils/haptics';
import { UI_TEXT } from '../config/textConfig';

interface ThoughtCardProps {
  thought: Thought;
  onDelete: () => void;
  onUpdate: (t: Thought) => void;
  onActionSelect: () => void;
  onNextStep: () => void;
}

export const ThoughtCard: React.FC<ThoughtCardProps> = ({ 
  thought, 
  onDelete, 
  onUpdate, 
  onActionSelect,
  onNextStep
}) => {
  const [isConfirmingDelete, setIsConfirmingDelete] = React.useState(false);
  const isC = thought.actionStep?.category === 'C';

  const handleConfirmDelete = () => {
    onDelete();
    setIsConfirmingDelete(false);
  };

  return (
    <motion.div 
      layout
      className={`p-6 rounded-2xl bg-[#FFFFFF] border border-[#E0E0E0] transition-all duration-300 shadow-xs relative overflow-hidden`}
    >
      {/* 放下確認覆蓋層 */}
      <AnimatePresence>
        {isConfirmingDelete && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 bg-white/95 backdrop-blur-sm flex flex-col items-center justify-center space-y-4"
          >
            <p className="text-sm text-[#424242] font-light">{UI_TEXT.review.card.confirmDropTitle}</p>
            <div className="flex gap-4">
              <button 
                onClick={() => setIsConfirmingDelete(false)}
                className="px-5 py-1.5 text-xs rounded-full bg-[#EFEEEB] text-[#5E5E5E] hover:text-[#2C2C2C] transition-colors cursor-pointer"
              >
                {UI_TEXT.review.card.keepBtn}
              </button>
              <button 
                onClick={handleConfirmDelete}
                className="px-5 py-1.5 text-xs rounded-full bg-[#FEECEB] text-[#C62828] hover:bg-[#FCD8D5] transition-colors cursor-pointer"
              >
                {UI_TEXT.review.card.dropBtn}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex justify-between items-start gap-4">
        <div className="space-y-1.5 flex-grow">
          <div className="text-xs text-[#A3A3A3] font-mono">
            {new Date(thought.createdAt).toLocaleString('zh-TW', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </div>
          
          <ThoughtContent thought={thought} />

          {thought.actionStep && (
            <ActionInfo 
              thought={thought} 
              isC={isC} 
            />
          )}

          <motion.button 
            whileTap={{ scale: 0.98 }}
            onClick={(e) => {
              e.stopPropagation();
              onNextStep();
            }}
            className="w-full mt-3 py-2.5 px-4 rounded-xl border border-dashed border-[#D1D1CB] bg-[#FDFDFB] text-[#5E5E5E] text-sm font-light hover:border-[#424242] hover:text-[#424242] transition-all flex items-center justify-center gap-2 group cursor-pointer shadow-xs active:bg-[#F4F4F0]"
          >
            <span className="group-hover:translate-x-1 transition-transform text-xs">→</span>
            {UI_TEXT.review.card.nextStepBtn}
          </motion.button>
        </div>

        <ActionButtons 
          isC={isC}
          onActionSelect={onActionSelect}
          onDelete={() => setIsConfirmingDelete(true)}
        />
      </div>
    </motion.div>
  );
};

// --- Sub-components for better readability (SRP) ---

const getCategoryLabel = (cat?: string) => {
  switch (cat) {
    case 'A': return UI_TEXT.action.categories.A.label;
    case 'B': return UI_TEXT.action.categories.B.label;
    case 'C': return UI_TEXT.action.categories.C.label;
    case 'D': return UI_TEXT.action.categories.D.label;
    default: return UI_TEXT.review.card.pastSteps;
  }
};

const ThoughtContent: React.FC<{ thought: Thought }> = ({ thought }) => {
  if (thought.type === 'AWARENESS') {
    return <div className="text-[#5E5E5E] italic font-light">{UI_TEXT.review.card.awareness}</div>;
  }

  if (thought.actionStep) {
    const stepText = thought.actionStep.text || thought.content;
    if (stepText === thought.content) {
      return null; // 若當前步驟與原始念頭文字完全相同，則不顯示冗餘的上下文
    }
    return (
      <div className="text-sm text-[#A3A3A3] font-light truncate">
        {UI_TEXT.review.card.sourcePrefix}{thought.content}{UI_TEXT.review.card.sourceSuffix}
      </div>
    );
  }

  return (
    <div className={`text-lg font-light leading-relaxed whitespace-pre-wrap text-[#424242]`}>
      {thought.content}
    </div>
  );
};

const ActionInfo: React.FC<{ 
  thought: Thought, 
  isC: boolean
}> = ({ thought, isC }) => {
  const hasHistory = thought.stepHistory && thought.stepHistory.length > 0;

  const displayTag = getCategoryLabel(thought.actionStep?.category);

  return (
    <div className="mt-3 space-y-3">
      {hasHistory && <StepHistory history={thought.stepHistory!} />}

      <div className="p-3.5 rounded-xl border bg-[#FDFDFB] border-[#E0E0E0] shadow-sm transition-all">
        <div className="flex items-center gap-2 mb-2">
          <div className="text-xs text-[#A3A3A3] tracking-widest font-semibold uppercase">
            {displayTag}
          </div>
          {thought.actionStep?.assignee && (
            <div className="text-[10px] bg-[#EFEEEB] text-[#5E5E5E] px-1.5 py-0.5 rounded font-medium">
              {UI_TEXT.review.card.assigneePrefix}{thought.actionStep.assignee}
            </div>
          )}
        </div>
        
        <div className="flex items-start gap-2.5">
          <div className="text-[#424242] font-normal text-[17px] leading-relaxed">
            {thought.actionStep?.text || thought.content}
          </div>
        </div>

        {thought.actionStep?.extraContent && (
          <div className="text-sm text-[#5E5E5E] mt-2.5 p-2.5 bg-white/50 rounded-lg border border-[#EFEEEB] italic">
            {thought.actionStep.extraContent}
          </div>
        )}
      </div>
    </div>
  );
};

const StepHistory: React.FC<{ history: any[] }> = ({ history }) => (
  <div className="space-y-3 pl-4 border-l-2 border-[#E0E0E0] ml-3 pb-1">
    {history.map((step, i) => (
      <div key={i} className="relative">
        {/* 節點點點 */}
        <div className="absolute -left-[23px] top-4 w-2.5 h-2.5 rounded-full bg-[#E0E0E0] ring-4 ring-[#FFFFFF]" />
        
        {/* 歷史方塊 */}
        <div className="bg-[#FDFDFB] border border-[#EFEEEB] rounded-xl p-3 opacity-75 grayscale-[0.2]">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="text-[10px] text-[#A3A3A3] tracking-widest font-semibold uppercase">
              {getCategoryLabel(step.category)}
            </div>
            {step.assignee && (
              <div className="text-[10px] bg-[#EFEEEB] text-[#5E5E5E] px-1.5 py-0.5 rounded font-medium">
                {UI_TEXT.review.card.assigneePrefix}{step.assignee}
              </div>
            )}
            {step.completedAt && (
              <div className="text-[10px] text-[#D1D1CB] font-mono ml-auto">
                {new Date(step.completedAt).toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' })}
              </div>
            )}
          </div>
          
          <div className="text-[13px] text-[#737373]">
            {step.text}
          </div>
          
          {step.extraContent && (
             <div className="text-xs text-[#A3A3A3] mt-2 italic truncate">
               {step.extraContent}
             </div>
          )}
        </div>
      </div>
    ))}
  </div>
);

const ActionButtons: React.FC<{
  isC: boolean,
  onActionSelect: () => void, onDelete: () => void
}> = ({ isC, onActionSelect, onDelete }) => (
  <div className="flex flex-col gap-2 pt-1">
    {isC && (
      <button onClick={onActionSelect} className="p-1.5 text-[#A3A3A3] hover:text-[#424242] cursor-pointer bg-[#F8F7F5] rounded-lg transition-colors" title="重新評估">
        <RotateCcw size={18} />
      </button>
    )}
    <button onClick={onDelete} className="p-1.5 text-[#A3A3A3] hover:text-[#424242] cursor-pointer bg-[#F8F7F5] rounded-lg transition-colors" title="放下">
      <Leaf size={18} />
    </button>
  </div>
);


const ActionButton: React.FC<{ label: string, onClick: () => void, isDanger?: boolean }> = 
({ label, onClick, isDanger }) => (
  <button onClick={onClick} className={`text-xs px-3.5 py-1.5 rounded-full bg-[#EFEEEB] text-[#5E5E5E] cursor-pointer ${isDanger ? 'hover:text-[#C62828]' : 'hover:text-[#2C2C2C]'}`}>
    {label}
  </button>
);
