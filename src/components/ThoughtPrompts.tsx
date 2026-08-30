import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GeminiProxyClient } from '../logic/geminiProxyClient';
import { UI_TEXT } from '../config/textConfig';

interface ThoughtPromptsProps {
  contextText?: string;
  onSelectPrompt?: (text: string) => void;
}

export const ThoughtPrompts: React.FC<ThoughtPromptsProps> = ({
  contextText,
  onSelectPrompt
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
      className="py-1 px-0.5 space-y-1.5 select-none"
    >
      {loading && (
        <div className="py-1.5 text-left text-xs text-ink-muted animate-pulse font-light tracking-wide">
          {UI_TEXT.promptEngine.loading}
        </div>
      )}

      {offlineNotice && !loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="py-1.5 text-left text-xs text-ink-muted font-light tracking-wide"
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
            className="space-y-2 pt-0.5"
          >
            {prompts.map((text, idx) => (
              <div
                key={`stem-${idx}`}
                onClick={() => onSelectPrompt?.(text)}
                className="flex items-baseline gap-2 text-[13px] sm:text-[13.5px] text-[#4B5563] font-normal leading-[1.7] tracking-wide cursor-pointer hover:text-ink transition-colors rounded-lg py-0.5"
                title="點擊帶入輸入框"
              >
                {/* 獨立圓點容器，確保折行時第二行完美對齊首字（懸掛縮排 Hanging Indent） */}
                <span className="text-[#71717A] text-xs select-none shrink-0 w-2.5 text-center">·</span>
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

