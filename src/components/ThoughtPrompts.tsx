import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { generatePrompts } from '../logic/promptEngine';
import { GeminiProxyClient } from '../logic/geminiProxyClient';
import { triggerHaptic } from '../utils/haptics';

interface ThoughtPromptsProps {
  contextText?: string;
  onSelectPrompt: (promptText: string) => void;
  onClose?: () => void;
}

export const ThoughtPrompts: React.FC<ThoughtPromptsProps> = ({
  contextText,
  onSelectPrompt
}) => {
  const [prompts, setPrompts] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadPrompts = async () => {
      if (!contextText || !contextText.trim()) {
        const localItems = generatePrompts(contextText);
        if (isMounted) setPrompts(localItems.map(p => p.text));
        return;
      }

      setLoading(true);
      try {
        if (GeminiProxyClient.isConfigured()) {
          const stems = await GeminiProxyClient.getPerspectiveStemsAsync(contextText);
          if (isMounted) {
            if (stems && stems.length > 0) {
              setPrompts(stems);
            } else {
              const localItems = generatePrompts(contextText);
              setPrompts(localItems.map(p => p.text));
            }
          }
        } else {
          const localItems = generatePrompts(contextText);
          if (isMounted) setPrompts(localItems.map(p => p.text));
        }
      } catch (err) {
        console.error('[ThoughtPrompts] 載入提示失敗，使用本機預設:', err);
        const localItems = generatePrompts(contextText);
        if (isMounted) setPrompts(localItems.map(p => p.text));
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadPrompts();
    return () => {
      isMounted = false;
    };
  }, [contextText]);

  const handleSelect = (text: string) => {
    triggerHaptic('step');
    onSelectPrompt(text);
  };

  if (prompts.length === 0 && !loading) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 6 }}
      className="p-4 sm:p-5 rounded-2xl border border-border-card bg-surface shadow-xs space-y-3 select-none"
    >
      {/* 提示選項 */}
      <div className="space-y-2">
        {loading ? (
          <div className="py-3 text-center text-xs text-ink-muted animate-pulse">
            思考入口生成中……
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={prompts.join('-')}
              initial={{ opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -3 }}
              transition={{ duration: 0.2 }}
              className="space-y-2"
            >
              {prompts.map((text, idx) => (
                <button
                  key={`prompt-${idx}`}
                  type="button"
                  onClick={() => handleSelect(text)}
                  className="w-full text-left p-3 rounded-xl border border-border-base bg-[#F9FAF9] hover:bg-surface hover:border-border-focus transition-all cursor-pointer flex items-start gap-2.5 group active:scale-[0.99]"
                >
                  <span className="text-ink-muted group-hover:text-ink text-xs mt-0.5 select-none">·</span>
                  <span className="prompt-option-text text-xs sm:text-sm flex-1 leading-relaxed font-normal text-ink">
                    {text}
                  </span>
                </button>
              ))}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </motion.div>
  );
};
