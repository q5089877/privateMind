
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trash2, CheckCircle2, RotateCcw } from 'lucide-react';
import { Thought } from '../types';

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
  const isAction = thought.type === 'ACTION' && 
                   (thought.actionStep?.category === 'A' || thought.actionStep?.category === 'B');

  const handleComplete = () => {
    if (thought.actionStep) {
      onUpdate({
        ...thought,
        actionStep: { ...thought.actionStep, isCompleted: !thought.actionStep.isCompleted }
      });
    }
  };

  const handleConfirmDelete = () => {
    onDelete();
    setIsConfirmingDelete(false);
  };

  return (
    <motion.div 
      layout
      className={`p-6 rounded-2xl bg-[#FFFFFF] border transition-all duration-300 shadow-xs relative overflow-hidden ${
        thought.actionStep?.isCompleted ? 'bg-[#F9F9F8] border-transparent opacity-65' : 'border-[#E0E0E0]'
      }`}
    >
      {/* 刪除確認覆蓋層 */}
      <AnimatePresence>
        {isConfirmingDelete && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 bg-white/95 backdrop-blur-sm flex flex-col items-center justify-center space-y-4"
          >
            <p className="text-sm text-[#424242] font-light">確定要放下這則思緒嗎？</p>
            <div className="flex gap-4">
              <button 
                onClick={() => setIsConfirmingDelete(false)}
                className="px-5 py-1.5 text-xs rounded-full bg-[#EFEEEB] text-[#5E5E5E] hover:text-[#2C2C2C] transition-colors cursor-pointer"
              >
                先留著
              </button>
              <button 
                onClick={handleConfirmDelete}
                className="px-5 py-1.5 text-xs rounded-full bg-[#FEECEB] text-[#C62828] hover:bg-[#FCD8D5] transition-colors cursor-pointer"
              >
                確定放下
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
              onUpdate={onUpdate}
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
            再往下一步
          </motion.button>
        </div>

        <ActionButtons 
          isC={isC}
          onActionSelect={onActionSelect}
          onDelete={() => setIsConfirmingDelete(true)}
        />
      </div>
      
      {isC && !thought.actionStep?.isCompleted && (
        <DeferredActions 
          onKeep={() => onUpdate({...thought, actionStep: {...thought.actionStep!, lastReviewAt: Date.now()}})}
          onAction={onActionSelect}
          onDrop={onDelete}
        />
      )}
    </motion.div>
  );
};

// --- Sub-components for better readability (SRP) ---

const ThoughtContent: React.FC<{ thought: Thought }> = ({ thought }) => (
  thought.type === 'AWARENESS' ? (
    <div className="text-[#5E5E5E] italic font-light">這是一次無聲的覺察</div>
  ) : (
    <div className={`text-lg font-light leading-relaxed whitespace-pre-wrap ${thought.actionStep?.isCompleted ? 'text-[#9E9E9E] line-through' : 'text-[#424242]'}`}>
      {thought.content}
    </div>
  )
);

const ActionInfo: React.FC<{ 
  thought: Thought, 
  isC: boolean, 
  onUpdate: (t: Thought) => void
}> = ({ thought, isC, onUpdate }) => {
  const hasHistory = thought.stepHistory && thought.stepHistory.length > 0;

  return (
    <div className="mt-3 space-y-2.5">
      {hasHistory && <StepHistory history={thought.stepHistory!} />}

      <div className={`p-3.5 rounded-xl border transition-all ${
        thought.actionStep?.isCompleted 
          ? 'bg-[#F9F9F8] border-[#EFEEEB] opacity-80' 
          : 'bg-[#FDFDFB] border-[#E0E0E0] shadow-sm'
      }`}>
        <div className="flex items-center gap-2 mb-1.5">
          <div className="text-[10px] text-[#A3A3A3] tracking-[0.1em] font-bold uppercase">
            {isC ? '暫時放著' : (thought.actionStep?.subOption || '目前的下一步')}
          </div>
          {thought.actionStep?.assignee && (
            <div className="text-[10px] bg-[#EFEEEB] text-[#5E5E5E] px-1.5 py-0.5 rounded font-medium">
              找 {thought.actionStep.assignee}
            </div>
          )}
        </div>
        
        <div className="flex items-start gap-2.5">
          {thought.actionStep && !isC && (
            <input 
              type="checkbox"
              checked={!!thought.actionStep.isCompleted}
              onChange={() => onUpdate({
                ...thought,
                actionStep: { ...thought.actionStep!, isCompleted: !thought.actionStep!.isCompleted }
              })}
              className="mt-1 w-4 h-4 rounded-sm border-[#E0E0E0] text-[#424242] focus:ring-0 cursor-pointer flex-shrink-0"
            />
          )}
          <div className={`text-[#424242] font-normal text-base leading-relaxed ${thought.actionStep?.isCompleted ? 'line-through text-[#9E9E9E]' : ''}`}>
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
  <div className="space-y-3 pl-3 border-l-2 border-[#E0E0E0] ml-2.5 pb-2">
    {history.map((step, i) => (
      <div key={i} className="flex items-start gap-3 relative">
        {/* 節點點點：負 margin-left 讓它蓋在垂直線上 */}
        <div className="absolute -left-[17px] top-1.5 w-2 h-2 rounded-full bg-[#BDBDBD] ring-4 ring-[#FFFFFF]" />
        
        <div className="space-y-0.5">
          <div className="text-[#5E5E5E] text-sm font-light">
            {step.text}
          </div>
          {step.completedAt && (
            <div className="text-[10px] text-[#A3A3A3] font-mono">
              {new Date(step.completedAt).toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' })}
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
    <button onClick={onDelete} className="p-1.5 text-[#A3A3A3] hover:text-[#C62828] cursor-pointer bg-[#F8F7F5] rounded-lg transition-colors" title="放下">
      <Trash2 size={18} />
    </button>
  </div>
);

const DeferredActions: React.FC<{ onKeep: () => void, onAction: () => void, onDrop: () => void }> = 
({ onKeep, onAction, onDrop }) => {
  const [confirmDrop, setConfirmDrop] = React.useState(false);

  return (
    <div className="mt-4 pt-3.5 border-t border-[#EFEEEB]">
       <div className="text-xs text-[#5E5E5E] mb-2.5">
         {confirmDrop ? '確定要放下這件事嗎？' : '現在還做不到嗎？'}
       </div>
       <div className="flex flex-wrap gap-2">
          {!confirmDrop ? (
            <>
              <ActionButton label="繼續放著" onClick={onKeep} />
              <ActionButton label="現在想處理一點" onClick={onAction} />
              <ActionButton label="決定放下" onClick={() => setConfirmDrop(true)} isDanger />
            </>
          ) : (
            <>
              <ActionButton label="先留著" onClick={() => setConfirmDrop(false)} />
              <ActionButton label="確定放下" onClick={onDrop} isDanger />
            </>
          )}
       </div>
    </div>
  );
};

const ActionButton: React.FC<{ label: string, onClick: () => void, isDanger?: boolean }> = 
({ label, onClick, isDanger }) => (
  <button onClick={onClick} className={`text-xs px-3.5 py-1.5 rounded-full bg-[#EFEEEB] text-[#5E5E5E] cursor-pointer ${isDanger ? 'hover:text-[#C62828]' : 'hover:text-[#2C2C2C]'}`}>
    {label}
  </button>
);
