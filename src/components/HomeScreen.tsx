import React, { useEffect, useRef, useState } from 'react';
import { ArrowDown, Bookmark, History, MoreHorizontal, Waves } from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';
import { UI_TEXT } from '../config/textConfig';

interface Props { onStartInput: (text: string) => void; onReview: () => void; }

const HarborSketch = () => <svg aria-hidden="true" viewBox="0 0 160 160" fill="none" className="h-full w-full text-accent/80" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
  <path d="M18 112c13-11 27-11 40 0 13 11 27 11 40 0 13-11 27-11 44 1" />
  <path d="M18 126c13-11 27-11 40 0 13 11 27 11 40 0 13-11 27-11 44 1" />
  <path d="M20 96c13-11 27-11 40 0 13 11 27 11 40 0 13-11 27-11 42 0" />
  <path d="M72 96V45l37 33H72" /><path d="M72 56 48 77h24" />
  <path d="m41 137 11-11m-5-5 10 10" /><path d="M47 131a12 12 0 1 0 17 17" />
  <path d="M25 38c7-8 14-8 21 0" /><path d="M117 33c6-6 12-6 18 0" />
  <path d="M126 68c8 0 13 6 13 13-8 0-13-6-13-13Z" /><path d="M139 81c-8 0-13 6-13 13 8 0 13-6 13-13Z" />
</svg>;

export const HomeScreen: React.FC<Props> = ({ onStartInput, onReview }) => {
  const [input, setInput] = useState('');
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);
  const save = () => { if (!input.trim()) return; triggerHaptic('docking'); onStartInput(input); setInput(''); };

  return <div className="w-full max-w-[580px] min-h-[calc(100vh-104px)] py-4 sm:py-9">
    <header className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span className="h-12 w-12 rounded-[17px] border border-white/20 bg-accent text-accent-text shadow-[0_3px_0_rgba(29,76,57,0.3),0_12px_20px_rgba(53,106,85,0.16)] flex items-center justify-center sm:h-14 sm:w-14 sm:rounded-[20px]"><Waves size={24} strokeWidth={1.55}/></span>
        <div><p className="text-[18px] font-semibold leading-none tracking-[-0.04em] text-ink sm:text-[21px]">思緒停靠</p><p className="mt-1.5 text-[10px] tracking-[0.2em] text-ink-muted sm:mt-2 sm:text-[11px]">MIND HARBOR</p></div>
      </div>
      <button type="button" onClick={onReview} aria-label="查看留下來的事" className="h-11 w-11 rounded-full text-ink-muted transition-colors hover:bg-surface hover:text-ink flex items-center justify-center"><MoreHorizontal size={22} strokeWidth={1.7}/></button>
    </header>

    <main className="pt-11 sm:pt-28">
      <section className="px-1 sm:px-2">
        <p className="mb-4 text-[14px] font-medium text-accent flex items-center gap-2.5 sm:mb-6 sm:text-[16px] sm:gap-3"><span className="h-1.5 w-1.5 rounded-full bg-accent sm:h-2 sm:w-2"/>不必現在想完</p>
        <h1 className="text-[28px] sm:text-[48px] font-semibold tracking-[-0.065em] leading-[1.16] text-ink">留下還沒想完的事。</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-secondary sm:mt-6 sm:text-[18px]">等時間過去，再看自己怎麼走到今天。</p>
      </section>

      <div className="relative mt-8 pb-2 sm:mt-16 sm:pb-3">
        <div aria-hidden="true" className="absolute inset-x-3 bottom-0 h-8 rounded-b-[30px] bg-[#e4ebe4] shadow-[0_10px_16px_rgba(53,82,66,0.1)] sm:h-12 sm:rounded-b-[34px]" />
        <section className="relative overflow-hidden rounded-[28px] border border-white/90 bg-[#fffdf8] p-5 shadow-[0_2px_0_rgba(255,255,255,0.9),0_16px_30px_rgba(53,82,66,0.11)] sm:rounded-[34px] sm:p-7 sm:shadow-[0_2px_0_rgba(255,255,255,0.9),0_22px_38px_rgba(53,82,66,0.13)]">
          <div aria-hidden="true" className="absolute bottom-3 right-3 hidden h-32 w-32 rounded-full bg-[#eef3ed] p-2 text-accent/10 sm:block"><HarborSketch /></div>
          <div className="relative z-10">
            <p className="mb-3 text-[16px] font-semibold tracking-[-0.025em] text-ink sm:mb-5 sm:text-[17px]">此刻的我，怎麼想</p>
            <textarea ref={ref} rows={4} value={input} onChange={event => setInput(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); save(); } }} placeholder={UI_TEXT.home.inputPlaceholder} className="min-h-[100px] w-full resize-none border-0 bg-transparent p-0 text-[16px] leading-[1.6] text-ink caret-[#2C3E35] placeholder:!text-[#8C9088] outline-none sm:min-h-[150px] sm:text-[19px]" />
            <div className="mt-4 border-t border-border-base/75 pt-4 sm:mt-5 sm:pt-5">
              <button type="button" disabled={!input.trim()} onClick={save} className="flex min-h-[54px] w-full items-center justify-center gap-3 rounded-[19px] border-t border-white/35 bg-accent text-[16px] font-semibold text-accent-text shadow-[0_3px_0_rgba(29,76,57,0.32),0_9px_15px_rgba(53,106,85,0.18)] transition-all hover:-translate-y-px hover:bg-accent-hover active:translate-y-[2px] active:shadow-[0_1px_0_rgba(29,76,57,0.32),0_5px_10px_rgba(53,106,85,0.16)] disabled:cursor-not-allowed disabled:opacity-35 sm:min-h-[62px] sm:rounded-[22px] sm:text-[18px]"><Bookmark size={19} strokeWidth={1.8}/>先留下這一刻 <ArrowDown size={17} strokeWidth={2}/></button>
            </div>
          </div>
        </section>
      </div>
    </main>

    <button type="button" onClick={onReview} className="mt-8 min-h-11 px-1 text-[15px] text-ink-muted transition-colors hover:text-ink flex items-center gap-2 sm:mt-14 sm:text-[16px]"><History size={17} strokeWidth={1.5}/>回頭看看自己怎麼走到這裡</button>
  </div>;
};
