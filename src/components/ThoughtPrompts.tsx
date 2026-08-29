import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RefreshCw, X } from 'lucide-react';
import { generatePrompts, PromptItem } from '../logic/promptEngine';
import { UI_TEXT } from '../config/textConfig';
import { triggerHaptic } from '../utils/haptics';

interface ThoughtPromptsProps {
  contextText?: string;
  onSelectPrompt: (promptText: string) => void;
  onClose?: () => void;
}

export const ThoughtPrompts: React.FC<ThoughtPromptsProps> = ({
  contextText,
  onSelectPrompt,
  onClose
}) => {
  const [prompts, setPrompts] = useState<PromptItem[]>([]);
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [isRotating, setIsRotating] = useState(false);

  const fetchPrompts = () => {
    const nextPrompts = generatePrompts(contextText, recentIds);
    setPrompts(nextPrompts);
    setRecentIds(prev => {
      const newIds = [...prev, ...nextPrompts.map(p => p.id)];
      return newIds.slice(-12);
    });
  };

  useEffect(() => {
    fetchPrompts();
  }, [contextText]);

  const handleRefresh = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic('step');
    setIsRotating(true);
    fetchPrompts();
    setTimeout(() => setIsRotating(false), 300);
  };

  const handleSelect = (text: string) => {
    triggerHaptic('step');
    onSelectPrompt(text);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 6 }}
      className="p-4 sm:p-5 rounded-2xl border border-border-card bg-surface shadow-xs space-y-3.5 select-none"
    >
      {/* 標題與關閉 */}
      <div className="flex items-center justify-between">
        <span className="prompt-header text-xs tracking-wide">
          {UI_TEXT.promptEngine.header}
        </span>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-ink-muted hover:text-ink transition-colors cursor-pointer rounded-md"
            title={UI_TEXT.promptEngine.close}
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* 3 個開放思考提示 */}
      <div className="space-y-2">
        <AnimatePresence mode="wait">
          <motion.div
            key={prompts.map(p => p.id).join('-')}
            initial={{ opacity: 0, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -3 }}
            transition={{ duration: 0.2 }}
            className="space-y-2"
          >
            {prompts.map((prompt) => (
              <button
                key={prompt.id}
                type="button"
                onClick={() => handleSelect(prompt.text)}
                className="w-full text-left p-3 rounded-xl border border-border-base bg-[#F9FAF9] hover:bg-surface hover:border-border-focus transition-all cursor-pointer flex items-start gap-2.5 group active:scale-[0.99]"
              >
                <span className="text-ink-muted group-hover:text-ink text-xs mt-0.5 select-none">○</span>
                <span className="prompt-option-text text-xs sm:text-sm flex-1 leading-relaxed font-normal">
                  {prompt.text}
                </span>
              </button>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* 底部說明與「換一組」 */}
      <div className="flex items-center justify-between pt-1 text-xs">
        <span className="secondary-label text-xs">
          {UI_TEXT.promptEngine.footer}
        </span>

        <button
          type="button"
          onClick={handleRefresh}
          className="refresh-btn flex items-center gap-1 text-xs font-normal transition-colors cursor-pointer py-1 px-2.5 rounded-lg hover:bg-surface-muted active:scale-95"
        >
          <RefreshCw size={12} className={isRotating ? 'animate-spin' : ''} />
          <span>{UI_TEXT.promptEngine.refresh}</span>
        </button>
      </div>
    </motion.div>
  );
};
