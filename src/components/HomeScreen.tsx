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

  return <div className="w-full max-w-[580px] min-h-[calc(100vh-104px)] py-6 sm:py-9">
    <header className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span className="h-14 w-14 rounded-[20px] border border-white/20 bg-accent text-accent-text shadow-[0_3px_0_rgba(29,76,57,0.3),0_16px_26px_rgba(53,106,85,0.2)] flex items-center justify-center"><Waves size={27} strokeWidth={1.55}/></span>
        <div><p className="text-[21px] font-semibold leading-none tracking-[-0.04em] text-ink">思緒停靠</p><p className="mt-2 text-[11px] tracking-[0.2em] text-ink-muted">MIND HARBOR</p></div>
      </div>
      <button type="button" onClick={onReview} aria-label="查看留下來的事" className="h-11 w-11 rounded-full text-ink-muted transition-colors hover:bg-surface hover:text-ink flex items-center justify-center"><MoreHorizontal size={22} strokeWidth={1.7}/></button>
    </header>

    <main className="pt-20 sm:pt-28">
      <section className="px-1 sm:px-2">
        <p className="mb-6 text-[16px] font-medium text-accent flex items-center gap-3"><span className="h-2 w-2 rounded-full bg-accent"/>不必現在想完</p>
        <h1 className="text-[38px] sm:text-[48px] font-semibold tracking-[-0.07em] leading-[1.1] text-ink">留下還沒想完的事。</h1>
        <p className="mt-6 text-[18px] leading-relaxed text-ink-secondary">等時間過去，再看自己怎麼走到今天。</p>
      </section>

      <div className="relative mt-14 pb-3 sm:mt-16">
        <div aria-hidden="true" className="absolute inset-x-3 bottom-0 h-12 rounded-b-[34px] bg-[#e4ebe4] shadow-[0_13px_19px_rgba(53,82,66,0.12)]" />
        <section className="relative overflow-hidden rounded-[34px] border border-white/90 bg-[#fffdf8] p-5 shadow-[0_2px_0_rgba(255,255,255,0.9),0_22px_38px_rgba(53,82,66,0.13)] sm:p-7">
          <div aria-hidden="true" className="absolute right-2 top-2 h-28 w-28 rounded-full bg-[#eef3ed] p-2 text-accent/55 sm:right-4 sm:top-3 sm:h-32 sm:w-32"><HarborSketch /></div>
          <div className="relative z-10">
            <p className="mb-5 pr-28 text-[17px] font-semibold tracking-[-0.025em] text-ink">此刻的我，怎麼想</p>
            <textarea ref={ref} rows={4} value={input} onChange={event => setInput(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); save(); } }} placeholder={UI_TEXT.home.inputPlaceholder} className="relative z-10 min-h-[168px] w-full resize-none rounded-[24px] border border-white bg-[#f8f7f1] px-4 py-4 text-[19px] leading-[1.7] text-ink shadow-[inset_0_2px_8px_rgba(57,75,64,0.09),0_1px_0_rgba(255,255,255,0.9)] outline-none transition-shadow focus:shadow-[inset_0_2px_8px_rgba(57,75,64,0.09),0_0_0_3px_rgba(53,106,85,0.14)] sm:px-5" />
            <div className="mt-5 border-t border-border-base/75 pt-5">
              <button type="button" disabled={!input.trim()} onClick={save} className="flex min-h-[62px] w-full items-center justify-center gap-3 rounded-[22px] border-t border-white/35 bg-accent text-[18px] font-semibold text-accent-text shadow-[0_3px_0_rgba(29,76,57,0.32),0_12px_18px_rgba(53,106,85,0.2)] transition-all hover:-translate-y-px hover:bg-accent-hover active:translate-y-[2px] active:shadow-[0_1px_0_rgba(29,76,57,0.32),0_5px_10px_rgba(53,106,85,0.16)] disabled:cursor-not-allowed disabled:opacity-35"><Bookmark size={20} strokeWidth={1.8}/>先留下這一刻 <ArrowDown size={18} strokeWidth={2}/></button>
            </div>
          </div>
        </section>
      </div>
    </main>

    <button type="button" onClick={onReview} className="mt-14 min-h-11 px-1 text-[16px] text-ink-muted transition-colors hover:text-ink flex items-center gap-2"><History size={18} strokeWidth={1.5}/>回頭看看自己怎麼走到這裡</button>
  </div>;
};
