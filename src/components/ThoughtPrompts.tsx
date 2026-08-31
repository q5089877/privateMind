import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GeminiProxyClient, ThoughtOperation } from '../logic/geminiProxyClient';
import { generatePrompts } from '../logic/promptEngine';
import { UI_TEXT } from '../config/textConfig';
import { Eye, ArrowLeftRight, Clock, Target, Compass } from 'lucide-react';

interface ThoughtPromptsProps {
  contextText?: string;
  onSelectPrompt?: (text: string) => void;
}

const getOperationIcon = (type: ThoughtOperation['type']) => {
  switch (type) {
    case 'isolate':
      return <Eye size={13} strokeWidth={1.5} className="text-accent/80" />;
    case 'contrast':
      return <ArrowLeftRight size={13} strokeWidth={1.5} className="text-accent/80" />;
    case 'zoom_out':
      return <Clock size={13} strokeWidth={1.5} className="text-accent/80" />;
    case 'landing':
      return <Target size={13} strokeWidth={1.5} className="text-accent/80" />;
    default:
      return <Compass size={13} strokeWidth={1.5} className="text-accent/80" />;
  }
};

export const ThoughtPrompts: React.FC<ThoughtPromptsProps> = ({
  contextText,
  onSelectPrompt
}) => {
  const [operations, setOperations] = useState<ThoughtOperation[]>([]);
  const [loading, setLoading] = useState(false);
  const [offlineNotice, setOfflineNotice] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    if (hasLoadedRef.current) return;

    let isMounted = true;
    const cleanText = (contextText || '').trim();

    if (!cleanText) {
      setOperations([]);
      setOfflineNotice(null);
      setLoading(false);
      return;
    }

    const loadOperations = async () => {
      if (!GeminiProxyClient.isConfigured()) {
        if (isMounted) {
          setLoading(false);
          const fallback = generatePrompts(cleanText).map((p, idx) => ({
            type: (idx === 0 ? 'isolate' : idx === 1 ? 'contrast' : 'landing') as ThoughtOperation['type'],
            label: p.focalLabel,
            actionPrompt: p.text
          }));
          setOperations(fallback);
          hasLoadedRef.current = true;
        }
        return;
      }

      setLoading(true);
      try {
        const ops = await GeminiProxyClient.getThoughtOperationsAsync(cleanText);
        if (isMounted) {
          if (ops && ops.length > 0) {
            setOperations(ops);
            setOfflineNotice(null);
            hasLoadedRef.current = true;
          } else {
            const fallback = generatePrompts(cleanText).map((p, idx) => ({
              type: (idx === 0 ? 'isolate' : idx === 1 ? 'contrast' : 'landing') as ThoughtOperation['type'],
              label: p.focalLabel,
              actionPrompt: p.text
            }));
            setOperations(fallback);
            hasLoadedRef.current = true;
          }
        }
      } catch (err) {
        console.warn('[ThoughtPrompts] 思維操作生成異常:', err);
        if (isMounted) {
          const fallback = generatePrompts(cleanText).map((p, idx) => ({
            type: (idx === 0 ? 'isolate' : idx === 1 ? 'contrast' : 'landing') as ThoughtOperation['type'],
            label: p.focalLabel,
            actionPrompt: p.text
          }));
          setOperations(fallback);
          hasLoadedRef.current = true;
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadOperations();

    return () => {
      isMounted = false;
    };
  }, [contextText]);

  if (operations.length === 0 && !loading && !offlineNotice) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 4 }}
      className="py-1 px-0.5 space-y-2 select-none"
    >
      {loading && (
        <div className="py-2 space-y-2 select-none" aria-busy="true">
          <div className="text-[11px] text-ink-muted/70 font-light tracking-wider mb-1 flex items-center gap-1.5">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent/50 animate-pulse" />
            <span>{UI_TEXT.promptEngine.loading}</span>
          </div>
          <div className="grid grid-cols-1 gap-1.5">
            {[80, 65].map((widthPct, idx) => (
              <div
                key={`op-skeleton-${idx}`}
                className="h-10 bg-surface-muted/40 rounded-xl animate-pulse border border-border-subtle/50"
              />
            ))}
          </div>
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

      {operations.length > 0 && !loading && (
        <AnimatePresence mode="wait">
          <motion.div
            key={operations.map(o => o.label).join('-')}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="space-y-1.5 pt-0.5"
          >
            <div className="text-[11px] text-ink-muted/65 font-light tracking-wider mb-1">
              思維操作入口：
            </div>
            <div className="grid grid-cols-1 gap-1.5">
              {operations.map((op, idx) => (
                <button
                  key={`op-card-${idx}`}
                  type="button"
                  onClick={() => onSelectPrompt?.(op.actionPrompt)}
                  className="w-full text-left p-2.5 rounded-xl border border-border-subtle bg-surface/70 hover:bg-surface hover:border-border-base transition-all duration-200 cursor-pointer active:scale-[0.99] group shadow-2xs flex flex-col gap-0.5"
                  title="點擊帶入此操作視角"
                >
                  <div className="flex items-center gap-1.5 text-xs font-medium text-ink group-hover:text-accent transition-colors">
                    {getOperationIcon(op.type)}
                    <span>{op.label}</span>
                  </div>
                  <div className="text-[12px] text-ink-muted group-hover:text-ink-secondary transition-colors font-light leading-relaxed pl-5">
                    {op.actionPrompt}
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      )}
    </motion.div>
  );
};
