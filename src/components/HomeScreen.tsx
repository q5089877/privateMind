import React, { useEffect, useRef, useState } from 'react';
import { ArrowUp, History, Waves } from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';
import { UI_TEXT } from '../config/textConfig';

interface Props { onStartInput: (text: string) => void; onReview: () => void; }

export const HomeScreen: React.FC<Props> = ({ onStartInput, onReview }) => {
  const [input, setInput] = useState('');
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);
  const save = () => { if (!input.trim()) return; triggerHaptic('docking'); onStartInput(input); setInput(''); };

  return <div className="w-full max-w-[560px] min-h-[calc(100vh-104px)] flex flex-col py-2 sm:py-4">
    <header className="h-12 flex items-center justify-between">
      <div className="flex items-center gap-2.5 text-ink"><Waves size={20} strokeWidth={1.6} className="text-accent"/><span className="text-[15px] font-medium tracking-tight">思緒停靠</span></div>
      <button type="button" onClick={onReview} className="min-h-11 px-2.5 rounded-xl text-sm text-ink-secondary hover:bg-surface-hover hover:text-ink transition-colors flex items-center gap-1.5"><History size={16} strokeWidth={1.5}/>留下來的事</button>
    </header>

    <main className="flex-1 flex flex-col justify-center pb-[12vh]">
      <section className="max-w-[510px]">
        <p className="text-sm font-medium text-accent mb-3">此刻</p>
        <h1 className="text-[30px] sm:text-[36px] font-medium tracking-[-0.045em] leading-tight text-ink">現在腦中有什麼？</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-secondary">留下一句就好。它可以先停在這裡。</p>
      </section>

      <section className="mt-12 border-t border-border-base">
        <textarea ref={ref} rows={4} value={input} onChange={event => setInput(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); save(); } }} placeholder={UI_TEXT.home.inputPlaceholder} className="w-full bg-transparent pt-5 text-[20px] leading-[1.65] text-ink placeholder:text-ink-placeholder outline-none resize-none" />
        <div className="mt-4 pt-4 border-t border-border-subtle flex items-center justify-between gap-4">
          <p className="text-xs text-ink-muted">按 Enter 停靠 · Shift + Enter 換行</p>
          <button type="button" disabled={!input.trim()} onClick={save} className="min-h-11 rounded-full bg-ink px-4 text-sm font-medium text-surface transition-all hover:bg-accent disabled:cursor-not-allowed disabled:opacity-25 flex items-center gap-2">停靠 <ArrowUp size={16} strokeWidth={1.8}/></button>
        </div>
      </section>
    </main>

    <button type="button" onClick={onReview} className="self-start text-sm text-ink-muted hover:text-ink transition-colors py-2">回頭看看留下的事 →</button>
  </div>;
};
