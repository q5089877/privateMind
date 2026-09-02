import React, { useEffect, useRef, useState } from 'react';
import { ArrowDown, Bookmark, History, Waves } from 'lucide-react';
import harborSailboat from '../assets/harbor-sailboat.png';
import { triggerHaptic } from '../utils/haptics';
import { UI_TEXT } from '../config/textConfig';

interface Props { onStartInput: (text: string) => void; onReview: () => void; }

export const HomeScreen: React.FC<Props> = ({ onStartInput, onReview }) => {
  const [input, setInput] = useState('');
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { ref.current?.focus(); }, []);

  const save = () => {
    if (!input.trim()) return;
    triggerHaptic('docking');
    onStartInput(input);
    setInput('');
  };

  return <div className="w-full max-w-[590px] min-h-[calc(100vh-104px)] px-1 py-7 sm:py-11">
    <header className="flex items-center gap-4 sm:gap-5">
      <span className="flex h-[68px] w-[68px] shrink-0 items-center justify-center rounded-[22px] bg-[#315e49] text-white shadow-[0_5px_12px_rgba(35,69,53,0.13)] sm:h-[82px] sm:w-[82px] sm:rounded-[26px]"><Waves size={36} strokeWidth={1.5} className="sm:scale-110" /></span>
      <div><p className="font-serif text-[29px] font-semibold leading-none tracking-[-0.07em] text-ink sm:text-[38px]">思緒停靠</p><p className="mt-2 text-[12px] tracking-[0.17em] text-ink-muted sm:mt-3 sm:text-[15px]">MIND HARBOR</p></div>
    </header>

    <main className="pt-12 sm:pt-20">
      <section className="px-1">
        <p className="flex items-center gap-3 text-[15px] text-ink-secondary sm:text-[18px]"><span className="h-3 w-3 rounded-full bg-[#b2c9b5]" />不必現在想完</p>
        <h1 className="mt-10 font-serif text-[38px] font-semibold leading-[1.24] tracking-[-0.075em] text-ink sm:mt-12 sm:text-[55px]">留下還沒想完的事。</h1>
        <p className="mt-5 max-w-[440px] font-serif text-[21px] leading-[1.55] tracking-[-0.035em] text-ink-secondary sm:text-[28px]">等時間過去，再看自己怎麼走到今天。</p>
      </section>

      <div className="relative mt-10 pb-4 sm:mt-14 sm:pb-5">
        <div aria-hidden="true" className="absolute inset-x-3 bottom-0 h-8 rounded-b-[29px] border-x border-b border-[#dde2d8] bg-[#fafaf6] shadow-[0_11px_16px_rgba(47,70,54,0.10)] sm:h-11 sm:rounded-b-[35px]" />
        <section className="relative overflow-hidden rounded-[29px] border border-[#e8e9e1] bg-white p-5 shadow-[0_3px_10px_rgba(47,70,54,0.11)] sm:rounded-[36px] sm:p-8">
          <p className="relative z-10 text-[20px] font-semibold tracking-[-0.045em] text-ink sm:text-[25px]">此刻的我，怎麼想</p>
          <div className="relative mt-5 min-h-[205px] overflow-hidden rounded-[18px] border border-[#e3e2d7] bg-[#fcfcf3] px-5 py-5 sm:mt-7 sm:min-h-[255px] sm:rounded-[22px] sm:px-7 sm:py-7">
            <textarea ref={ref} rows={4} value={input} onChange={event => setInput(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); save(); } }} placeholder={UI_TEXT.home.inputPlaceholder} className="relative z-10 min-h-[130px] w-full resize-none border-0 bg-transparent p-0 text-[19px] leading-[1.65] tracking-[-0.03em] text-ink caret-[#315e49] placeholder:!text-[#6d726b] outline-none sm:min-h-[165px] sm:text-[23px]" />
            <img src={harborSailboat} aria-hidden="true" alt="" className="pointer-events-none absolute -bottom-[3%] -right-[5%] w-[330px] max-w-none opacity-80 mix-blend-multiply sm:-bottom-[4%] sm:-right-[2%] sm:w-[410px]" />
          </div>
          <div className="mt-5 border-t border-[#e3e4de] pt-5 sm:mt-7 sm:pt-7">
            <button type="button" disabled={!input.trim()} onClick={save} className="flex min-h-[58px] w-full items-center justify-center gap-3 rounded-[18px] border border-white/40 bg-[#8cad95] text-[18px] font-semibold tracking-[-0.03em] text-white shadow-[0_5px_11px_rgba(67,101,77,0.20)] transition-all hover:-translate-y-px hover:bg-accent active:translate-y-px disabled:cursor-not-allowed disabled:opacity-70 sm:min-h-[68px] sm:rounded-[21px] sm:text-[22px]"><Bookmark size={21} strokeWidth={1.7} />先留下這一刻 <ArrowDown size={19} strokeWidth={2} /></button>
          </div>
        </section>
      </div>
    </main>

    <button type="button" onClick={onReview} className="mt-10 flex min-h-11 items-center gap-3 px-1 text-[16px] text-ink-secondary transition-colors hover:text-ink sm:mt-14 sm:text-[20px]"><History size={22} strokeWidth={1.5} />回頭看看自己怎麼走到這裡</button>
  </div>;
};
