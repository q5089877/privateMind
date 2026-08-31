import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, Plus, RotateCcw, Sparkles, Waves } from 'lucide-react';
import { UI_TEXT } from '../config/textConfig';
import { ThoughtThread } from '../types';
import { AdditionForm } from './AdditionForm';
import { ThoughtPrompts } from './ThoughtPrompts';
import { ThoughtOperation } from '../logic/geminiProxyClient';

interface CompletionScreenProps {
  thread: ThoughtThread | null;
  onReset: () => void;
  onAppendEntry?: (content: string, type?: import('../types').EntryType) => void | Promise<void>;
}

const formatTime = (timestamp: number) => {
  const d = new Date(timestamp);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

export const CompletionScreen: React.FC<CompletionScreenProps> = ({ thread, onReset, onAppendEntry }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [showNotice, setShowNotice] = useState(true);
  const [showPerspectives, setShowPerspectives] = useState(false);
  const [activeOperation, setActiveOperation] = useState<ThoughtOperation | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    timerRef.current = setTimeout(() => setShowNotice(false), 3000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  if (!thread) return null;
  const entries = thread.entries;
  const contextText = entries.map((entry) => entry.content).join('\n');
  const lastEntryContent = entries[entries.length - 1]?.content || '';
  const operationStyle = (index: number) => {
    if (!activeOperation) return {};
    const isLatest = index === entries.length - 1;
    if (activeOperation.type === 'isolate') return isLatest ? {} : { opacity: 0.3, filter: 'blur(1px)' };
    if (activeOperation.type === 'contrast') return { transform: index % 2 === 0 ? 'translateX(-7px)' : 'translateX(7px)' };
    if (activeOperation.type === 'zoom_out') return { opacity: isLatest ? 1 : 0.55, transform: `scale(${0.94 + index * 0.02})` };
    if (activeOperation.type === 'landing') return isLatest ? { transform: 'scale(1.025)', boxShadow: '0 8px 24px rgba(75,95,85,0.12)' } : { opacity: 0.42 };
    return { opacity: isLatest ? 1 : 0.58 };
  };
  const startAdding = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setShowNotice(false);
    setShowPerspectives(false);
    setIsAdding(true);
  };

  return (
    <div className="w-full max-w-xl space-y-4 sm:space-y-5 flex flex-col items-center text-center">
      <div className={`flex items-center justify-center pt-2 select-none overflow-hidden transition-all duration-700 ${showNotice && !isAdding ? 'min-h-[40px] opacity-100' : 'min-h-0 opacity-0 pointer-events-none'}`}>
        <AnimatePresence>{showNotice && !isAdding && <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ delay: 0.25, duration: 0.55 }} className="text-lg sm:text-xl font-light text-ink tracking-wide">{UI_TEXT.completion.ceremony.deposit}</motion.p>}</AnimatePresence>
      </div>

      <motion.section initial={{ opacity: 0, scale: 0.96, y: -8 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.4 }} className="w-full relative overflow-hidden p-4 sm:p-5 rounded-[28px] bg-surface-subtle border border-border-base text-left shadow-sm">
        <Waves size={74} strokeWidth={1} className="absolute -right-3 -bottom-3 text-accent/[0.09] pointer-events-none" aria-hidden="true" />
        <div className="relative flex items-start justify-between gap-4 mb-4 select-none">
          <div><h2 className="text-sm font-medium tracking-wide text-ink">{UI_TEXT.completion.desk.title}</h2><p className="text-xs text-ink-muted font-light mt-1">{activeOperation ? UI_TEXT.completion.desk.perspectiveActive : UI_TEXT.completion.desk.hint}</p></div>
          {activeOperation && <button type="button" onClick={() => setActiveOperation(null)} className="shrink-0 text-xs text-ink-muted hover:text-ink py-1 px-2 rounded-full hover:bg-surface transition-colors flex items-center gap-1"><RotateCcw size={12} />{UI_TEXT.completion.desk.resetPerspective}</button>}
        </div>

        <div className={`relative space-y-2.5 transition-all duration-500 ${activeOperation?.type === 'contrast' && entries.length > 1 ? 'grid grid-cols-2 gap-2 space-y-0' : ''}`}>
          {entries.map((entry, index) => <motion.article key={entry.id} layout transition={{ duration: 0.35 }} style={operationStyle(index)} className="rounded-2xl bg-surface/90 border border-border-subtle px-3.5 py-3 transition-all duration-500"><time className="block text-[11px] text-ink-muted font-mono mb-1.5">{formatTime(entry.createdAt)}</time><p className="text-sm sm:text-base leading-relaxed whitespace-pre-wrap text-ink">{entry.content}</p></motion.article>)}
        </div>

        <div className="relative mt-4 pt-3 border-t border-border-subtle select-none">
          {!isAdding && <button type="button" onClick={() => setShowPerspectives((value) => !value)} className="text-xs text-ink-secondary hover:text-ink py-1.5 px-2 rounded-lg hover:bg-surface transition-colors flex items-center gap-1.5"><Sparkles size={13} className="text-accent" />{UI_TEXT.completion.desk.perspectiveBtn}</button>}
          <AnimatePresence>{showPerspectives && !isAdding && <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden"><p className="text-[11px] text-ink-muted mt-2 mb-1">{UI_TEXT.completion.desk.operationHint}</p><ThoughtPrompts compact contextText={contextText} onSelectOperation={(operation) => { setActiveOperation(operation); setShowPerspectives(false); }} /></motion.div>}</AnimatePresence>
          <AnimatePresence>{isAdding && onAppendEntry && <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="pt-2"><AdditionForm contextText={lastEntryContent} onSave={async (content, type) => { await onAppendEntry(content, type); setIsAdding(false); }} onCancel={() => setIsAdding(false)} /></motion.div>}</AnimatePresence>
        </div>
      </motion.section>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }} className="w-full flex flex-col items-center gap-1.5 pt-1 select-none">
        {!showNotice && !isAdding && <p className="text-xs text-ink-muted font-light tracking-wide mb-1">{activeOperation ? UI_TEXT.completion.desk.writingHint : '已記下。可以繼續，也可以就這樣。'}</p>}
        {!isAdding && onAppendEntry && <button type="button" onClick={startAdding} className="text-xs sm:text-sm text-ink hover:text-ink-primary py-1.5 px-4 rounded-full hover:bg-surface-hover transition-colors flex items-center gap-1.5"><Plus size={13} className="text-ink-muted" /><span>{UI_TEXT.completion.exits.addAddition.replace('＋ ', '')}</span></button>}
        <button type="button" onClick={onReset} className="text-xs text-ink-muted hover:text-ink py-1.5 px-3 rounded-full flex items-center gap-1.5"><Check size={12} /><span>{UI_TEXT.completion.exits.backHome}</span></button>
      </motion.div>
    </div>
  );
};
