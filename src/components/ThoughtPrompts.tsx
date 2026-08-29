import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GeminiProxyClient } from '../logic/geminiProxyClient';
import { UI_TEXT } from '../config/textConfig';

interface ThoughtPromptsProps {
  contextText?: string;
}

export const ThoughtPrompts: React.FC<ThoughtPromptsProps> = ({
  contextText
}) => {
  const [prompts, setPrompts] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [offlineNotice, setOfflineNotice] = useState<string | null>(null);
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadPrompts = async () => {
      if (!contextText || !contextText.trim()) {
        if (isMounted) {
          setPrompts([]);
          setOfflineNotice(null);
        }
        return;
      }

      // 未配置 API Key / Worker：顯示溫和離線反饋，2.8s 後安靜淡出
      if (!GeminiProxyClient.isConfigured()) {
        if (isMounted) {
          setOfflineNotice(UI_TEXT.promptEngine.offlineNotice);
          fadeTimerRef.current = setTimeout(() => {
            if (isMounted) setOfflineNotice(null);
          }, 2800);
        }
        return;
      }

      setLoading(true);
      try {
        const stems = await GeminiProxyClient.getPerspectiveStemsAsync(contextText);
        if (isMounted) {
          if (stems && stems.length > 0) {
            setPrompts(stems);
            setOfflineNotice(null);
          } else {
            setPrompts([]);
            setOfflineNotice(UI_TEXT.promptEngine.offlineNotice);
            fadeTimerRef.current = setTimeout(() => {
              if (isMounted) setOfflineNotice(null);
            }, 2800);
          }
        }
      } catch (err) {
        console.warn('[ThoughtPrompts] 連線失敗:', err);
        if (isMounted) {
          setPrompts([]);
          setOfflineNotice(UI_TEXT.promptEngine.offlineNotice);
          fadeTimerRef.current = setTimeout(() => {
            if (isMounted) setOfflineNotice(null);
          }, 2800);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadPrompts();
    return () => {
      isMounted = false;
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    };
  }, [contextText]);

  if (prompts.length === 0 && !loading && !offlineNotice) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 4 }}
      className="py-2 px-1 space-y-2 select-none"
    >
      {loading && (
        <div className="py-2 text-left text-xs text-ink-muted/60 animate-pulse font-light tracking-wide">
          {UI_TEXT.promptEngine.loading}
        </div>
      )}

      {offlineNotice && !loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="py-2 text-left text-xs text-ink-muted/50 font-light tracking-wide"
        >
          {offlineNotice}
        </motion.div>
      )}

      {prompts.length > 0 && !loading && (
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

