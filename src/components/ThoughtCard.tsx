import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Leaf, Trash2 } from 'lucide-react';
import { Thought, ThoughtAddition } from '../types';
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
  
  // 重新處理 (Re-process) 狀態
  const [isReprocessing, setIsReprocessing] = useState(false);
  const [reprocessStepText, setReprocessStepText] = useState(thought.actionStep?.text || '');
  const [reprocessingAdditionId, setReprocessingAdditionId] = useState<string | null>(null);
  const [reprocessAdditionText, setReprocessAdditionText] = useState('');

  // 再看看 (Deepening Tool) 狀態
  const [isDeepeningOpen, setIsDeepeningOpen] = useState(false);
  const [feeling, setFeeling] = useState(thought.reflection?.feeling || '');
  const [reaction, setReaction] = useState(thought.reflection?.reaction || '');
  
  const isReleased = thought.currentDisposition === 'RELEASE';

  const handleConfirm = () => {
    if (confirmType === 'DELETE') {
      onDelete();
      setConfirmType(null);
    } else if (confirmType === 'RELEASE') {
      onRelease();
      setConfirmType(null);
    }
  };

  const handleSaveReprocess = () => {
    if (!reprocessStepText.trim()) return;
    triggerHaptic('step');
    onUpdate({
      ...thought,
      actionStep: { text: reprocessStepText.trim() }
    });
    setIsReprocessing(false);
  };

  const handleSaveAdditionReprocess = (additionId: string) => {
    if (!reprocessAdditionText.trim() || !thought.additions) return;
    triggerHaptic('step');
    const updatedAdditions = thought.additions.map(a => 
      a.id === additionId ? { ...a, actionStep: { text: reprocessAdditionText.trim() } } : a
    );
    onUpdate({
      ...thought,
      additions: updatedAdditions
    });
    setReprocessingAdditionId(null);
  };

  const handleSaveReflection = (newFeeling: string, newReaction: string) => {
    onUpdate({
      ...thought,
      reflection: {
        feeling: newFeeling.trim() || undefined,
        reaction: newReaction.trim() || undefined
      }
    });
  };

  let retentionText = '';
  if (thought.retentionUntil) {
    const d = new Date(thought.retentionUntil);
    retentionText = `${UI_TEXT.review.card.retentionPrefix}${d.getMonth() + 1} 月 ${d.getDate()} 日`;
  }

  return (
    <motion.div 
      layout
      animate={{
        y: isReleased ? 4 : 0,
        scale: isReleased ? 0.99 : 1,
        opacity: isReleased ? 0.92 : 1,
      }}
      transition={{ duration: 1.2, ease: [0.25, 1, 0.5, 1] }}
      className={`p-6 rounded-2xl border transition-colors duration-1000 relative overflow-hidden ${
        isReleased 
          ? 'bg-surface-subtle border-border-subtle shadow-none' 
          : 'bg-surface border-border-base shadow-xs'
      }`}
    >
      <AnimatePresence>
        {confirmType && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 bg-surface/95 backdrop-blur-xs flex flex-col items-center justify-center space-y-4"
          >
            <p className="text-sm text-ink font-light">
              {confirmType === 'DELETE' ? UI_TEXT.review.card.confirmDeleteTitle : UI_TEXT.review.card.confirmReleaseTitle}
            </p>
            <div className="flex gap-4">
              <button 
                onClick={() => setConfirmType(null)}
                className="px-5 py-1.5 text-xs rounded-full bg-surface-muted text-ink-secondary hover:text-ink transition-colors cursor-pointer"
              >
                {UI_TEXT.review.card.keepBtn}
              </button>
              <button 
                onClick={handleConfirm}
                className="px-5 py-1.5 text-xs rounded-full bg-border-base text-ink hover:bg-surface-hover transition-colors cursor-pointer"
              >
                {confirmType === 'DELETE' ? UI_TEXT.review.card.deleteBtn : UI_TEXT.review.card.releaseBtn}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex justify-between items-start gap-4">
        <div className="space-y-2 flex-grow">
          <div className="text-xs text-ink-muted font-mono flex items-center gap-2">
            <span>{new Date(thought.createdAt).toLocaleString('zh-TW', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
            {isReleased && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-surface text-ink-muted border border-border-subtle font-sans">
                放下了。
              </span>
            )}
          </div>
          
          <ThoughtContent thought={thought} />

          {/* 既有行動步驟與「重新處理」 */}
          {thought.actionStep?.text && (
            <div className={`p-3.5 rounded-xl border space-y-2 transition-colors duration-700 ${
              isReleased 
                ? 'bg-surface/50 border-border-subtle opacity-75' 
                : 'bg-surface-subtle border-border-base'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-xs text-ink-muted font-medium">下一步</span>
                {!isReleased && !isReprocessing && (
                  <button 
                    onClick={() => {
                      setReprocessStepText(thought.actionStep?.text || '');
                      setIsReprocessing(true);
                    }}
                    className="text-[11px] text-ink-muted hover:text-ink transition-colors cursor-pointer"
                  >
                    {UI_TEXT.reprocess.btn}
                  </button>
                )}
              </div>

              {!isReprocessing ? (
                <div className={`text-base font-normal ${isReleased ? 'text-ink-secondary' : 'text-ink'}`}>
                  {thought.actionStep.text}
                </div>
              ) : (
                <div className="space-y-2 pt-1">
                  <div className="text-xs text-ink-muted">{UI_TEXT.reprocess.title}</div>
                  <textarea
                    autoFocus
                    value={reprocessStepText}
                    onChange={(e) => setReprocessStepText(e.target.value)}
                    placeholder={UI_TEXT.reprocess.placeholder}
                    className="w-full bg-surface border border-border-base focus:border-border-focus rounded-xl p-2.5 text-sm text-ink outline-none resize-none min-h-[50px]"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setIsReprocessing(false)}
                      className="px-3 py-1 text-xs text-ink-muted hover:text-ink transition-colors cursor-pointer"
                    >
                      {UI_TEXT.reprocess.cancelBtn}
                    </button>
                    <button
                      onClick={handleSaveReprocess}
                      className="px-4 py-1 text-xs rounded-full bg-accent text-accent-text hover:bg-accent-hover transition-colors cursor-pointer"
                    >
                      {UI_TEXT.reprocess.confirmBtn}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 深化工具「再看看」已儲存內容展示 */}
          {(thought.reflection?.feeling || thought.reflection?.reaction) && !isDeepeningOpen && (
            <div className="p-3 bg-surface-subtle/60 rounded-xl border border-border-subtle text-xs space-y-1.5 text-ink-secondary">
              {thought.reflection.feeling && (
                <div><span className="text-ink-muted">{UI_TEXT.deepening.feelingTitle}：</span>{thought.reflection.feeling}</div>
              )}
              {thought.reflection.reaction && (
                <div><span className="text-ink-muted">{UI_TEXT.deepening.reactionTitle}：</span>{thought.reflection.reaction}</div>
              )}
            </div>
          )}



          {/* Additions List */}
          {thought.additions && thought.additions.length > 0 && (
            <div className="mt-4 pt-4 border-t border-border-subtle space-y-3">
              <button 
                onClick={() => setIsAdditionsExpanded(!isAdditionsExpanded)}
                className="text-xs text-ink-secondary hover:text-ink transition-colors cursor-pointer flex items-center gap-1"
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
                    className="space-y-3 overflow-hidden"
                  >
                    {thought.additions.map(add => (
                      <div key={add.id} className="pl-3 border-l-2 border-border-base space-y-1 relative group">
                        <button 
                          onClick={() => onRemoveAddition(add.id)}
                          className="absolute -right-2 top-0 p-1 opacity-0 group-hover:opacity-100 text-ink-muted hover:text-red-600 transition-all cursor-pointer"
                          title="刪除這筆痕跡"
                        >
                          ✕
                        </button>
                        <div className="text-[10px] text-ink-muted font-mono">
                          {new Date(add.createdAt).toLocaleString('zh-TW', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div className="text-sm font-light text-ink whitespace-pre-wrap">{add.content}</div>
                        
                        {/* Addition 的下一步及重新處理 */}
                        {add.actionStep?.text && (
                          <div className="mt-1 p-2.5 bg-surface-subtle rounded-lg text-xs space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-ink-muted font-medium">下一步：{add.actionStep.text}</span>
                              {reprocessingAdditionId !== add.id && !isReleased && (
                                <button
                                  onClick={() => {
                                    setReprocessAdditionText(add.actionStep?.text || '');
                                    setReprocessingAdditionId(add.id);
                                  }}
                                  className="text-[10px] text-ink-muted hover:text-ink transition-colors cursor-pointer"
                                >
                                  {UI_TEXT.reprocess.btn}
                                </button>
                              )}
                            </div>
                            {reprocessingAdditionId === add.id && (
                              <div className="space-y-2 pt-1">
                                <input
                                  type="text"
                                  autoFocus
                                  value={reprocessAdditionText}
                                  onChange={(e) => setReprocessAdditionText(e.target.value)}
                                  placeholder={UI_TEXT.reprocess.placeholder}
                                  className="w-full bg-surface border border-border-base rounded p-1.5 text-xs text-ink outline-none"
                                />
                                <div className="flex justify-end gap-2">
                                  <button
                                    onClick={() => setReprocessingAdditionId(null)}
                                    className="text-[10px] text-ink-muted hover:text-ink cursor-pointer"
                                  >
                                    {UI_TEXT.reprocess.cancelBtn}
                                  </button>
                                  <button
                                    onClick={() => handleSaveAdditionReprocess(add.id)}
                                    className="px-2.5 py-0.5 text-[10px] rounded-full bg-accent text-accent-text hover:bg-accent-hover cursor-pointer"
                                  >
                                    {UI_TEXT.reprocess.confirmBtn}
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* 可選深化工具「再看看」展開介面 */}
          <AnimatePresence>
            {isDeepeningOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 p-4 bg-surface-subtle/80 rounded-2xl border border-border-base space-y-3 overflow-hidden text-left"
              >
                <div className="flex justify-between items-center pb-1 border-b border-border-subtle">
                  <span className="text-xs font-medium text-ink">{UI_TEXT.deepening.btn}</span>
                  <button 
                    onClick={() => setIsDeepeningOpen(false)}
                    className="text-xs text-ink-muted hover:text-ink cursor-pointer"
                  >
                    {UI_TEXT.deepening.hideBtn}
                  </button>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-ink-secondary">{UI_TEXT.deepening.feelingTitle}</label>
                  <textarea
                    rows={2}
                    value={feeling}
                    onChange={(e) => {
                      setFeeling(e.target.value);
                      handleSaveReflection(e.target.value, reaction);
                    }}
                    placeholder={UI_TEXT.deepening.feelingPlaceholder}
                    className="w-full bg-surface border border-border-base focus:border-border-focus rounded-xl p-2.5 text-xs text-ink outline-none resize-none leading-relaxed"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-ink-secondary">{UI_TEXT.deepening.reactionTitle}</label>
                  <textarea
                    rows={2}
                    value={reaction}
                    onChange={(e) => {
                      setReaction(e.target.value);
                      handleSaveReflection(feeling, e.target.value);
                    }}
                    placeholder={UI_TEXT.deepening.reactionPlaceholder}
                    className="w-full bg-surface border border-border-base focus:border-border-focus rounded-xl p-2.5 text-xs text-ink outline-none resize-none leading-relaxed"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 底部操作區：後來又想到 & 再看看 */}
          <div className="mt-4 pt-2 flex items-center justify-between">
            {!isAdding ? (
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setIsAdding(true)}
                  className="text-xs text-ink-muted hover:text-ink-secondary transition-colors cursor-pointer"
                >
                  {UI_TEXT.addition.addBtn}
                </button>
                {!isDeepeningOpen && !isReleased && (
                  <button
                    onClick={() => setIsDeepeningOpen(true)}
                    className="text-xs text-ink-muted hover:text-ink-secondary transition-colors cursor-pointer"
                  >
                    {UI_TEXT.deepening.btn}
                  </button>
                )}
              </div>
            ) : (
              <div className="w-full">
                <AdditionForm 
                  onSave={(addition) => {
                    onAddAddition(addition);
                    setIsAdding(false);
                    setIsAdditionsExpanded(true);
                  }}
                  onCancel={() => setIsAdding(false)}
                />
              </div>
            )}
          </div>

        </div>

        <div className="flex flex-col gap-1.5 pt-1 items-center">
          {!isReleased ? (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setConfirmType('RELEASE');
              }} 
              className="p-1.5 w-8 h-8 flex items-center justify-center text-ink-muted hover:text-ink cursor-pointer bg-surface-subtle hover:bg-surface-hover rounded-lg transition-colors" 
              title={UI_TEXT.review.card.releaseBtn}
            >
              <Leaf size={18} />
            </button>
          ) : (
            <>
              <div 
                className="p-1.5 w-8 h-8 flex items-center justify-center text-ink-muted/30 rounded-lg" 
                title="放下了。"
              >
                <Leaf size={18} />
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirmType('DELETE');
                }}
                className="p-1.5 w-7 h-7 flex items-center justify-center text-ink-muted/40 hover:text-red-500 hover:bg-red-50/50 rounded-lg transition-colors cursor-pointer"
                title={UI_TEXT.review.card.deleteBtn}
              >
                <Trash2 size={14} />
              </button>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
};

const ThoughtContent: React.FC<{ thought: Thought }> = ({ thought }) => {
  if (thought.awarenessOnly) {
    return <div className="text-ink-secondary italic font-light">{UI_TEXT.review.card.awareness}</div>;
  }

  return (
    <div className="text-lg font-light leading-relaxed whitespace-pre-wrap text-ink">
      {thought.content}
    </div>
  );
};
