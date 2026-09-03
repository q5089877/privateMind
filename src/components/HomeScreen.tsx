import React, { useEffect, useRef, useState } from 'react';
import { ArrowUp, History, MessageCircle, ShieldCheck, Sparkles, Waves } from 'lucide-react';
import { UI_TEXT } from '../config/textConfig';
import { triggerHaptic } from '../utils/haptics';
import { LinkCandidate } from '../types';

interface Props {
  onStartInput: (text: string) => void;
  onReview: () => void;
  candidate: LinkCandidate | null;
  onOpenCandidate: () => void;
  canDiscover: boolean;
  onOpenDiscovery: () => void;
  onOpenBackup: () => void;
}

export const HomeScreen: React.FC<Props> = ({ onStartInput, onReview, candidate, onOpenCandidate, canDiscover, onOpenDiscovery, onOpenBackup }) => {
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const beginConversation = () => {
    const text = input.trim();
    if (!text) return;
    triggerHaptic('docking');
    onStartInput(text);
    setInput('');
  };

  return <div className="w-full max-w-[590px] min-h-[calc(100vh-104px)] px-1 py-6 sm:py-10">
    <header className="flex items-center gap-3">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent text-white shadow-[0_8px_18px_rgba(47,91,71,0.16)]"><Waves size={25} strokeWidth={1.65}/></span>
      <div><p className="text-[21px] font-semibold tracking-[-0.05em] text-ink sm:text-[24px]">思緒停靠</p><p className="mt-0.5 text-[10px] tracking-[0.18em] text-ink-muted sm:text-[11px]">MIND HARBOR</p></div>
    </header>

    <main className="pt-12 sm:pt-16">
      <section className="px-1">
        <p className="flex items-center gap-2 text-sm font-medium text-accent"><span className="h-2 w-2 rounded-full bg-accent"/>現在這一刻</p>
        <h1 className="mt-5 max-w-[500px] text-[34px] font-medium leading-[1.2] tracking-[-0.055em] text-ink sm:text-[48px]">把卡在心裡的事，<br/>先說出來。</h1>
        <p className="mt-4 max-w-[410px] text-[16px] leading-[1.7] text-ink-secondary sm:text-[18px]">不用整理，也不用現在就有答案。先從最想說的那一句開始。</p>
      </section>

      <section className="mt-9 rounded-[28px] border border-border-base bg-surface px-5 py-5 shadow-[0_10px_28px_rgba(47,70,54,0.08)] sm:mt-12 sm:rounded-[32px] sm:px-7 sm:py-7">
        <div className="flex items-center gap-2 text-sm font-medium text-ink"><MessageCircle size={17} className="text-accent" strokeWidth={1.8}/>現在想說什麼？</div>
        <textarea ref={inputRef} rows={5} value={input} onChange={event => setInput(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); beginConversation(); } }} placeholder={UI_TEXT.home.inputPlaceholder} className="mt-5 min-h-[156px] w-full resize-none bg-transparent p-0 text-[18px] leading-[1.75] tracking-[-0.025em] text-ink caret-accent outline-none placeholder:text-ink-placeholder sm:min-h-[180px] sm:text-[21px]" />
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-base pt-4">
          <p className="text-xs leading-relaxed text-ink-muted">先說一句也可以。</p>
          <button type="button" disabled={!input.trim()} onClick={beginConversation} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-accent px-5 text-sm font-medium text-white shadow-[0_5px_12px_rgba(47,91,71,0.2)] transition-all hover:-translate-y-px hover:bg-accent-hover active:translate-y-px disabled:cursor-not-allowed disabled:opacity-35"><span>開始說說</span><ArrowUp size={16} strokeWidth={2}/></button>
        </div>
      </section>

      <p className="mt-4 px-2 text-sm leading-relaxed text-ink-secondary">送出後，我會先陪你看這一句；不替你急著下結論。</p>
    </main>

    <nav className="mt-10 border-t border-border-base pt-5 sm:mt-14">
      {candidate && <button type="button" onClick={onOpenCandidate} className="mb-3 w-full rounded-2xl border border-border-base bg-surface px-4 py-4 text-left shadow-[0_3px_10px_rgba(47,70,54,0.04)] transition-colors hover:bg-surface-subtle"><span className="flex items-center gap-2 text-sm font-medium text-accent"><Waves size={16}/>有 {candidate.momentIds.length} 段留下的話</span><span className="mt-1.5 block text-sm leading-relaxed text-ink-secondary">它們還留在各自的時間裡；若你想，可以只把原文並排看看。</span><span className="mt-3 inline-flex text-sm font-medium text-accent">把這幾段放在一起 →</span></button>}
      {canDiscover && <button type="button" onClick={onOpenDiscovery} className="mb-3 w-full rounded-2xl border border-accent/18 bg-accent/5 px-4 py-4 text-left transition-colors hover:bg-accent/10"><span className="flex items-center gap-2 text-sm font-medium text-accent"><Sparkles size={16}/>找幾段曾留下的話</span><span className="mt-1.5 block text-sm leading-relaxed text-ink-secondary">只找跨時間的原文；是否連在一起仍由你決定。</span></button>}
      <button type="button" onClick={onReview} className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl px-2 text-left text-[16px] text-ink-secondary transition-colors hover:bg-surface-subtle hover:text-ink"><span className="flex items-center gap-3"><History size={19} strokeWidth={1.7}/>回頭看看一路留下的事</span><span aria-hidden="true" className="text-ink-muted">→</span></button>
      <button type="button" onClick={onOpenBackup} className="mt-2 flex min-h-9 items-center gap-2 px-2 text-[13px] text-ink-muted transition-colors hover:text-ink"><ShieldCheck size={15} className="text-accent"/>內容只保存在這台裝置</button>
    </nav>
  </div>;
};
