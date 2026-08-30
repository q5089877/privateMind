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
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastFetchedTextRef = useRef<string>('');

  useEffect(() => {
    let isMounted = true;
    const cleanText = (contextText || '').trim();

    if (!cleanText) {
      setPrompts([]);
      setOfflineNotice(null);
      setLoading(false);
      return;
    }

    // 若與上次抓取的字樣完全相同，且已有起手式，則不重複呼叫
    if (cleanText === lastFetchedTextRef.current && prompts.length > 0) {
      return;
    }

    // 清除先前的防抖計時器
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // 500ms 防抖：使用者停下打字後自動重新生成即時 AI 起手式
    setLoading(true);
    debounceTimerRef.current = setTimeout(async () => {
      if (!GeminiProxyClient.isConfigured()) {
        if (isMounted) {
          setLoading(false);
          setOfflineNotice(UI_TEXT.promptEngine.offlineNotice);
        }
        return;
      }

      try {
        lastFetchedTextRef.current = cleanText;
        const stems = await GeminiProxyClient.getPerspectiveStemsAsync(cleanText);
        if (isMounted) {
          if (stems && stems.length > 0) {
            setPrompts(stems);
            setOfflineNotice(null);
          } else {
            setOfflineNotice(UI_TEXT.promptEngine.offlineNotice);
          }
        }
      } catch (err) {
        console.warn('[ThoughtPrompts] 連線或生成失敗:', err);
        if (isMounted) {
          setOfflineNotice(UI_TEXT.promptEngine.offlineNotice);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }, 500);

    return () => {
      isMounted = false;
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
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

