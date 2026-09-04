import React, { useEffect, useRef, useState } from 'react';
import { ArrowUp, ChevronDown, History, MessageCircle, ShieldCheck, Waves } from 'lucide-react';
import { UI_TEXT } from '../config/textConfig';
import { triggerHaptic } from '../utils/haptics';

interface Props {
  onStartInput: (text: string) => void;
  onReview: () => void;
  onOpenBackup: () => void;
}

const expressionGuides = [
  { id: 'busy', label: '腦袋很吵', options: [
    { label: '停不下來', prompt: '好多念頭同時出現，不知道先從哪一個說起。' },
    { label: '有件事懸著', prompt: '有件事一直掛在心上，還沒有想清楚。' },
  ] },
  { id: 'feeling', label: '心裡有感覺', options: [
    { label: '剛剛發生的', prompt: '剛剛發生了一件事，我還不知道該怎麼說。' },
    { label: '說不上來', prompt: '我現在說不上來，只知道心裡有些感覺。' },
  ] },
  { id: 'stuck', label: '有件事卡住', options: [
    { label: '不知道怎麼選', prompt: '我正在兩個方向之間，不知道怎麼選。' },
    { label: '不知道怎麼開始', prompt: '我知道有件事要開始，但還不知道第一步。' },
  ] },
  { id: 'keep', label: '有件想留下', options: [
    { label: '怕自己忘記', prompt: '有個念頭我想先留下，免得之後忘記。' },
    { label: '還沒想完', prompt: '這件事還沒想完，但我想先記住現在的感覺。' },
  ] },
] as const;

export const HomeScreen: React.FC<Props> = ({ onStartInput, onReview, onOpenBackup }) => {
  const [input, setInput] = useState('');
  const [showGuides, setShowGuides] = useState(false);
  const [activeGuideId, setActiveGuideId] = useState<string | null>(null);
  const [activePrompt, setActivePrompt] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const activeGuide = expressionGuides.find(guide => guide.id === activeGuideId);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const closeGuides = () => {
    setShowGuides(false);
    setActiveGuideId(null);
    setActivePrompt('');
  };

  const beginConversation = () => {
    const text = input.trim();
    if (!text) return;
    triggerHaptic('docking');
    onStartInput(text);
    setInput('');
    closeGuides();
  };

  const toggleGuides = () => {
    if (showGuides) closeGuides();
    else setShowGuides(true);
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-medium text-ink"><MessageCircle size={17} className="text-accent" strokeWidth={1.8}/>現在想說什麼？</div>
          <button type="button" aria-expanded={showGuides} onClick={toggleGuides} className="inline-flex min-h-9 items-center gap-1.5 rounded-full px-2 text-sm font-medium text-accent transition-colors hover:bg-surface-subtle hover:text-ink">
            不知道怎麼說？<ChevronDown size={15} className={`transition-transform ${showGuides ? 'rotate-180' : ''}`}/>
          </button>
        </div>

        {showGuides && <div className="mt-4 rounded-[20px] border border-border-base bg-surface-subtle p-4">
          <p className="text-xs leading-relaxed text-ink-muted">先點一個比較接近現在的狀態。這不是分類，也不會被保存。</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {expressionGuides.map(guide => <button key={guide.id} type="button" aria-pressed={activeGuideId === guide.id} onClick={() => { setActiveGuideId(guide.id); setActivePrompt(''); }} className={`rounded-full border px-3 py-2 text-sm transition-colors ${activeGuideId === guide.id ? 'border-accent bg-accent text-white' : 'border-border-base bg-surface text-ink-secondary hover:border-accent/45 hover:text-ink'}`}>{guide.label}</button>)}
          </div>
          {activeGuide && <div className="mt-4 border-t border-border-base pt-3">
            <p className="text-xs text-ink-muted">再靠近一點</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {activeGuide.options.map(option => <button key={option.label} type="button" aria-pressed={activePrompt === option.prompt} onClick={() => { setActivePrompt(option.prompt); requestAnimationFrame(() => inputRef.current?.focus()); }} className={`rounded-full border px-3 py-2 text-sm transition-colors ${activePrompt === option.prompt ? 'border-accent/70 bg-surface text-accent' : 'border-border-base bg-surface text-ink-secondary hover:border-accent/45 hover:text-ink'}`}>{option.label}</button>)}
            </div>
          </div>}
        </div>}

        {activePrompt && <aside aria-live="polite" className="mt-4 flex items-start justify-between gap-3 rounded-2xl border-l-2 border-accent/55 bg-surface-subtle px-4 py-3">
          <div><p className="text-[11px] font-medium text-accent">你可以從這裡開始</p><p className="mt-1 text-sm leading-relaxed text-ink-secondary">{activePrompt}</p></div>
          <button type="button" onClick={() => setActivePrompt('')} className="shrink-0 text-xs text-ink-muted hover:text-ink">收起</button>
        </aside>}

        <textarea ref={inputRef} rows={5} value={input} onChange={event => setInput(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); beginConversation(); } }} placeholder={UI_TEXT.home.inputPlaceholder} className="mt-5 min-h-[156px] w-full resize-none bg-transparent p-0 text-[18px] leading-[1.75] tracking-[-0.025em] text-ink caret-accent outline-none placeholder:text-ink-placeholder sm:min-h-[180px] sm:text-[21px]" />
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-base pt-4">
          <p className="text-xs leading-relaxed text-ink-muted">{showGuides ? '提示不會被保存，只有你寫下的文字會留下。' : '先說一句也可以。'}</p>
          <button type="button" disabled={!input.trim()} onClick={beginConversation} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-accent px-5 text-sm font-medium text-white shadow-[0_5px_12px_rgba(47,91,71,0.2)] transition-all hover:-translate-y-px hover:bg-accent-hover active:translate-y-px disabled:cursor-not-allowed disabled:opacity-35"><span>開始說說</span><ArrowUp size={16} strokeWidth={2}/></button>
        </div>
      </section>

      <p className="mt-4 px-2 text-sm leading-relaxed text-ink-secondary">送出後，我會先陪你把這一句看清一點；不替你急著下結論。</p>
    </main>

    <nav className="mt-10 border-t border-border-base pt-5 sm:mt-14">
      <button type="button" onClick={onReview} className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl px-2 text-left text-[16px] text-ink-secondary transition-colors hover:bg-surface-subtle hover:text-ink"><span className="flex items-center gap-3"><History size={19} strokeWidth={1.7}/>回看以前留下的事</span><span aria-hidden="true" className="text-ink-muted">→</span></button>
      <button type="button" onClick={onOpenBackup} className="mt-2 flex min-h-9 items-center gap-2 px-2 text-[13px] text-ink-muted transition-colors hover:text-ink"><ShieldCheck size={15} className="text-accent"/>內容只保存在這台裝置</button>
    </nav>
  </div>;
};