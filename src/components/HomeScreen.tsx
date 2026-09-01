import React, { useEffect, useRef, useState } from 'react';
import { ArrowUp, History, Waves } from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';
import { UI_TEXT } from '../config/textConfig';

interface Props { onStartInput: (text: string) => void; onReview: () => void; }

/** The capture screen is a quiet night harbour: one place to arrive, one thing to do. */
export const HomeScreen: React.FC<Props> = ({ onStartInput, onReview }) => {
  const [input, setInput] = useState('');
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);
  const save = () => { if (!input.trim()) return; triggerHaptic('docking'); onStartInput(input); setInput(''); };

  return <div className="relative isolate w-full max-w-[560px] min-h-[calc(100vh-104px)] overflow-hidden rounded-[30px] bg-[#173535] px-5 py-5 text-white shadow-[0_24px_70px_rgba(20,52,50,0.18)] sm:px-8 sm:py-7">
    {/* Ambient depth, intentionally abstract rather than a wellness illustration. */}
    <div aria-hidden="true" className="absolute -top-24 -right-28 h-72 w-72 rounded-full bg-[#74B5A8]/30 blur-3xl" />
    <div aria-hidden="true" className="absolute top-[35%] -left-32 h-64 w-64 rounded-full bg-[#2B7670]/35 blur-3xl" />
    <div aria-hidden="true" className="absolute -bottom-36 right-[-6rem] h-80 w-80 rounded-full border border-white/10" />
    <svg aria-hidden="true" className="absolute bottom-8 -right-20 h-56 w-[30rem] text-white/[0.09]" viewBox="0 0 480 220" fill="none"><path d="M-20 56C65 8 124 103 213 56S362 8 500 56" stroke="currentColor" strokeWidth="1.2"/><path d="M-20 98C65 50 124 145 213 98S362 50 500 98" stroke="currentColor" strokeWidth="1.2"/><path d="M-20 140C65 92 124 187 213 140S362 92 500 140" stroke="currentColor" strokeWidth="1.2"/></svg>

    <div className="relative z-10 min-h-[calc(100vh-144px)] flex flex-col">
      <header className="h-11 flex items-center justify-between">
        <div className="flex items-center gap-2.5"><span className="h-8 w-8 rounded-full border border-white/15 bg-white/10 flex items-center justify-center"><Waves size={17} strokeWidth={1.5}/></span><span className="text-[15px] font-medium tracking-tight">思緒停靠</span></div>
        <button type="button" onClick={onReview} className="min-h-10 rounded-xl px-2.5 text-sm text-white/70 transition-colors hover:bg-white/10 hover:text-white flex items-center gap-1.5"><History size={15} strokeWidth={1.5}/>留下來的事</button>
      </header>

      <main className="flex-1 flex flex-col justify-center pb-[10vh]">
        <section className="max-w-[430px]">
          <p className="text-sm font-medium text-[#A8D4C8] mb-4">此刻</p>
          <h1 className="text-[32px] sm:text-[39px] font-medium leading-[1.18] tracking-[-0.05em]">現在腦中有什麼？</h1>
          <p className="mt-4 text-[15px] leading-relaxed text-white/65">留下一句就好。這裡會先替你保管。</p>
        </section>

        <section className="mt-11 rounded-[26px] border border-white/20 bg-white/[0.12] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-xl sm:p-6">
          <textarea ref={ref} rows={4} value={input} onChange={event => setInput(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); save(); } }} placeholder={UI_TEXT.home.inputPlaceholder} className="w-full resize-none bg-transparent text-[20px] leading-[1.65] text-white placeholder:text-white/42 outline-none" />
          <div className="mt-5 flex items-center justify-between gap-3 border-t border-white/15 pt-4">
            <p className="text-xs text-white/45">Enter 停靠 · Shift + Enter 換行</p>
            <button type="button" disabled={!input.trim()} onClick={save} className="min-h-11 rounded-full bg-white px-4 text-sm font-medium text-[#173535] transition-all hover:bg-[#D8F0E8] disabled:cursor-not-allowed disabled:opacity-35 flex items-center gap-2">停靠 <ArrowUp size={16} strokeWidth={1.8}/></button>
          </div>
        </section>
      </main>

      <button type="button" onClick={onReview} className="self-start min-h-10 px-1 text-sm text-white/55 transition-colors hover:text-white">回頭看看留下的事 →</button>
    </div>
  </div>;
};
