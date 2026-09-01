import React, { useEffect, useRef, useState } from 'react';
import { ArrowDown, History, MoreHorizontal, Waves } from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';
import { UI_TEXT } from '../config/textConfig';

interface Props { onStartInput: (text: string) => void; onReview: () => void; }

export const HomeScreen: React.FC<Props> = ({ onStartInput, onReview }) => {
  const [input, setInput] = useState('');
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);
  const save = () => { if (!input.trim()) return; triggerHaptic('docking'); onStartInput(input); setInput(''); };

  return <div className="w-full max-w-[540px] min-h-[calc(100vh-104px)] py-5 sm:py-7">
    <header className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span className="h-12 w-12 rounded-[17px] bg-accent text-accent-text shadow-[0_10px_22px_rgba(53,106,85,0.2)] flex items-center justify-center"><Waves size={23} strokeWidth={1.6}/></span>
        <div><p className="text-[18px] font-semibold leading-none tracking-tight text-ink">思緒停靠</p><p className="mt-1.5 text-[11px] tracking-[0.16em] text-ink-muted">MIND HARBOR</p></div>
      </div>
      <button type="button" onClick={onReview} aria-label="查看留下來的事" className="h-11 w-11 rounded-full text-ink-muted transition-colors hover:bg-surface hover:text-ink flex items-center justify-center"><MoreHorizontal size={22} strokeWidth={1.7}/></button>
    </header>

    <main className="pt-14 sm:pt-20">
      <section className="px-1">
        <p className="mb-5 text-sm font-medium text-accent flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-accent"/>不必想清楚</p>
        <h1 className="text-[34px] sm:text-[41px] font-semibold tracking-[-0.055em] leading-[1.12] text-ink">現在腦中有什麼？</h1>
        <p className="mt-4 text-[17px] leading-relaxed text-ink-secondary">先放在這裡，等想再看時再看。</p>
      </section>

      <section className="relative mt-10 overflow-hidden rounded-[30px] border border-white bg-surface p-5 shadow-[0_20px_45px_rgba(53,82,66,0.11)] sm:p-6">
        <div aria-hidden="true" className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-accent/[0.06]" />
        <div className="relative">
          <p className="mb-4 text-[15px] font-medium text-ink-secondary">此刻的念頭</p>
          <textarea ref={ref} rows={4} value={input} onChange={event => setInput(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); save(); } }} placeholder={UI_TEXT.home.inputPlaceholder} className="min-h-[132px] w-full resize-none bg-transparent text-[19px] leading-[1.7] text-ink placeholder:text-ink-placeholder outline-none" />
          <div className="mt-4 border-t border-border-subtle pt-4">
            <button type="button" disabled={!input.trim()} onClick={save} className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-accent text-[17px] font-semibold text-accent-text shadow-[0_8px_16px_rgba(53,106,85,0.18)] transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-35">放下 <ArrowDown size={18} strokeWidth={2}/></button>
          </div>
        </div>
      </section>
    </main>

    <button type="button" onClick={onReview} className="mt-12 min-h-11 px-1 text-sm text-ink-muted transition-colors hover:text-ink flex items-center gap-1.5"><History size={15} strokeWidth={1.5}/>回頭看看留下的事</button>
  </div>;
};
