import React, { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Clock3 } from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';
import { UI_TEXT } from '../config/textConfig';

interface Props { onStartInput: (text: string) => void; onReview: () => void; }

export const HomeScreen: React.FC<Props> = ({ onStartInput, onReview }) => {
  const [input, setInput] = useState('');
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);
  const save = () => { if (!input.trim()) return; triggerHaptic('docking'); onStartInput(input); setInput(''); };

  return <div className="relative w-full min-h-[calc(100vh-104px)] -mx-4 sm:-mx-6 overflow-hidden bg-[#173A38] px-6 py-7 text-[#F7F7F2] sm:px-10 sm:py-9">
    <div aria-hidden="true" className="absolute -right-32 -top-28 h-80 w-80 rounded-full bg-[#4E9185]/35 blur-3xl" />
    <div aria-hidden="true" className="absolute -bottom-40 -left-32 h-96 w-96 rounded-full bg-[#0B2222]/45 blur-3xl" />

    <div className="relative mx-auto flex min-h-[calc(100vh-160px)] max-w-[560px] flex-col">
      <header className="flex h-10 items-center justify-between">
        <p className="text-[15px] font-medium tracking-tight text-white/90">思緒停靠</p>
        <button type="button" onClick={onReview} aria-label="查看留下來的事" className="flex h-10 w-10 items-center justify-center rounded-full text-white/65 transition-colors hover:bg-white/10 hover:text-white"><Clock3 size={19} strokeWidth={1.5}/></button>
      </header>

      <main className="flex flex-1 flex-col justify-center pb-16">
        <section>
          <p className="mb-4 text-sm font-medium text-[#A8D5C8]">現在</p>
          <h1 className="text-[31px] font-medium leading-[1.2] tracking-[-0.05em] sm:text-[38px]">有什麼想先放下？</h1>
          <p className="mt-4 text-[15px] leading-relaxed text-white/62">不用整理，也不用想清楚。</p>
        </section>

        <section className="mt-10 rounded-[24px] bg-[#F7F7F2] p-5 text-[#1C2D2B] shadow-[0_18px_45px_rgba(4,24,23,0.18)] sm:p-6">
          <textarea ref={ref} rows={4} value={input} onChange={event => setInput(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); save(); } }} placeholder={UI_TEXT.home.inputPlaceholder} className="w-full resize-none bg-transparent text-[19px] leading-[1.7] text-[#1C2D2B] placeholder:text-[#82908B] outline-none" />
          <div className="mt-5 flex items-center justify-between gap-4 border-t border-[#DCE3DE] pt-4">
            <p className="text-xs leading-relaxed text-[#74817B]">寫下一句就好</p>
            <button type="button" disabled={!input.trim()} onClick={save} className="flex h-11 shrink-0 items-center gap-1.5 rounded-full bg-[#1E4D49] px-4 text-sm font-medium text-white transition-colors hover:bg-[#143A36] disabled:cursor-not-allowed disabled:opacity-30">停靠 <ArrowUpRight size={15} strokeWidth={1.8}/></button>
          </div>
        </section>
      </main>

      <button type="button" onClick={onReview} className="self-start py-2 text-sm text-white/55 transition-colors hover:text-white">回頭看看留下的事</button>
    </div>
  </div>;
};
