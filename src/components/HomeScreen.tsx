import React, { useEffect, useRef, useState } from 'react';
import { ArrowDown, MoreHorizontal, Waves } from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';
import { UI_TEXT } from '../config/textConfig';
import { ThoughtThread } from '../types';

interface Props { onStartInput: (text: string) => void; onReview: () => void; getPastThoughts: () => Promise<ThoughtThread[]>; }

export const HomeScreen: React.FC<Props> = ({ onStartInput, onReview }) => {
  const [input, setInput] = useState(''); const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);
  const save = () => { if (!input.trim()) return; triggerHaptic('docking'); onStartInput(input); setInput(''); };
  return <div className="w-full max-w-[500px] flex flex-col min-h-[calc(100vh-104px)] py-2">
    <header className="flex items-center justify-between"><div className="flex items-center gap-2.5"><div className="w-10 h-10 rounded-2xl bg-accent text-accent-text flex items-center justify-center"><Waves size={21}/></div><div><p className="text-base font-semibold text-ink">思緒停靠</p><p className="text-xs tracking-[0.14em] text-ink-muted">MIND HARBOR</p></div></div><button onClick={onReview} className="w-10 h-10 rounded-2xl flex items-center justify-center text-ink-secondary hover:bg-surface"><MoreHorizontal size={21}/></button></header>
    <main className="w-full my-auto py-8 sm:py-12 space-y-5"><section className="px-1"><p className="text-sm text-accent font-medium mb-3">不必想清楚</p><h1 className="text-[34px] sm:text-[40px] font-semibold tracking-[-0.045em] text-ink leading-[1.12]">現在腦中<br/>有什麼？</h1><p className="text-base text-ink-secondary mt-3">先放在這裡。要不要回來看，由你決定。</p></section>
      <section className="relative overflow-hidden rounded-[32px] bg-surface border border-white p-5 sm:p-6 shadow-[0_18px_48px_rgba(37,67,49,0.10)]"><p className="text-sm font-medium text-ink-secondary mb-3">此刻的念頭</p><textarea ref={ref} rows={3} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();save();}}} placeholder={UI_TEXT.home.inputPlaceholder} className="w-full bg-transparent text-[18px] leading-[1.7] text-ink outline-none resize-none border-none p-0"/><div className="pt-5 mt-3 border-t border-border-subtle"><button onClick={save} className="w-full py-4 rounded-2xl bg-accent text-accent-text hover:bg-accent-hover text-[17px] font-semibold flex justify-center items-center gap-2">放下 <ArrowDown size={18}/></button></div></section>
    </main><button onClick={onReview} className="text-sm text-ink-muted hover:text-ink py-3">看看留下來的時間流</button>
  </div>;
};
