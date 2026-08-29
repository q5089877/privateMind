import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GeminiProxyClient } from '../logic/geminiProxyClient';
import { generatePrompts } from '../logic/promptEngine';

interface ThoughtPromptsProps {
  contextText?: string;
}

export const ThoughtPrompts: React.FC<ThoughtPromptsProps> = ({
  contextText
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
              // 若模型回傳空值，無縫提供 V7.2 標準三焦距起手式
              const fallbackStems = generatePrompts(contextText);
              setPrompts(fallbackStems.map(p => p.text));
            }
          }
        } else {
          const fallbackStems = generatePrompts(contextText);
          if (isMounted) setPrompts(fallbackStems.map(p => p.text));
        }
      } catch (err) {
        console.error('[ThoughtPrompts] 生成出錯，切換至標準三焦距起手式:', err);
        const fallbackStems = generatePrompts(contextText);
        if (isMounted) setPrompts(fallbackStems.map(p => p.text));
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadPrompts();
    return () => {
      isMounted = false;
    };
  }, [contextText]);

  if (prompts.length === 0 && !loading) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 4 }}
      className="py-2 px-1 space-y-2 select-none"
    >
      {loading ? (
        <div className="py-2 text-left text-xs text-ink-muted/60 animate-pulse font-light tracking-wide">
          思考入口生成中……
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={prompts.join('-')}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="space-y-2.5"
          >
            {prompts.map((text, idx) => (
              <div
                key={`stem-${idx}`}
                className="flex items-baseline gap-2.5 text-xs sm:text-sm text-[#52525B] font-normal leading-[1.85] tracking-wide"
              >
                <span className="text-[#71717A] text-xs select-none shrink-0">·</span>
                <span className="flex-1 select-text">
                  {text}
                </span>
              </div>
            ))}
          </motion.div>
        </AnimatePresence>
      )}
    </motion.div>
  );
};
