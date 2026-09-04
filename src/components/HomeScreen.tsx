import React, { useEffect, useRef, useState } from 'react';
import { ArrowUp, History, MessageCircle, ShieldCheck, Waves } from 'lucide-react';
import { UI_TEXT } from '../config/textConfig';
import { triggerHaptic } from '../utils/haptics';

interface Props {
  onStartInput: (text: string) => void;
  onReview: () => void;
  onOpenBackup: () => void;
}

const quickStates = [
  { id: 'busy', label: '腦袋太吵', draft: '好多念頭同時衝進來，不知道先顧哪一個，停不下來。' },
  { id: 'feeling', label: '心裡很悶', draft: '剛剛發生了一件事，說不上來是什麼感覺，但心裡很堵。' },
  { id: 'stuck', label: '事情卡住', draft: '手上有件事卡在兩個選擇之間，完全不知道該怎麼走下一步。' },
  { id: 'keep', label: '先留著', draft: '有個念頭我怕之後忘記，想先原封不動留在這裡。' },
] as const;

const ventWords = ['停', '先別想', '呼', '可以', '隨它'] as const;

export const HomeScreen: React.FC<Props> = ({ onStartInput, onReview, onOpenBackup }) => {
  const [input, setInput] = useState('');
  const [ventCount, setVentCount] = useState(0);
  const [ventWord, setVentWord] = useState('');
  const [activeQuickState, setActiveQuickState] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleVent = () => {
    triggerHaptic('unlatch');
    const nextCount = ventCount + 1;
    setVentCount(nextCount);
    const word = ventWords[(nextCount - 1) % ventWords.length];
    setVentWord(word);
  };

  const handleQuickState = (state: typeof quickStates[number]) => {
    setActiveQuickState(state.id);
    setInput(state.draft);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const beginConversation = () => {
    const text = input.trim();
    if (!text) return;
    triggerHaptic('docking');
    onStartInput(text);
    setInput('');
    setActiveQuickState(null);
  };

  return <div className="w-full max-w-[590px] min-h-[calc(100vh-104px)] px-1 py-6 sm:py-10">
    <header className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent text-white shadow-[0_8px_18px_rgba(47,91,71,0.16)]"><Waves size={25} strokeWidth={1.65}/></span>
        <div><p className="text-[21px] font-semibold tracking-[-0.05em] text-ink sm:text-[24px]">思緒停靠</p><p className="mt-0.5 text-[10px] tracking-[0.18em] text-ink-muted sm:text-[11px]">MIND HARBOR</p></div>
      </div>

      <div className="flex flex-col items-end">
        <button
          type="button"
          onClick={handleVent}
          className="group relative flex h-9 items-center gap-2 rounded-full border border-accent/25 bg-surface px-3.5 text-xs font-medium text-ink-secondary transition-all hover:border-accent/50 hover:bg-surface-subtle active:scale-95 shadow-2xs"
          title="消波微震"
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent/40 opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-accent"></span>
          </span>
          <span>{ventWord || '消波微震'}</span>
        </button>
        {ventCount >= 3 && (
          <span className="mt-1 text-[11px] text-ink-muted">
            已消波 {ventCount} 次 · 想說的話，再點這裡
          </span>
        )}
      </div>
    </header>

    <main className="pt-10 sm:pt-14">
      <section className="px-1">
        <p className="flex items-center gap-2 text-sm font-medium text-accent"><span className="h-2 w-2 rounded-full bg-accent"/>現在這一刻</p>
        <h1 className="mt-5 max-w-[500px] text-[34px] font-medium leading-[1.2] tracking-[-0.055em] text-ink sm:text-[48px]">把卡在心裡的事，<br/>先說出來。</h1>
        <p className="mt-4 max-w-[410px] text-[16px] leading-[1.7] text-ink-secondary sm:text-[18px]">不用整理，也不用現在就有答案。先從最想說的那一句開始。</p>
      </section>

      <section className="mt-9 rounded-[28px] border border-border-base bg-surface px-5 py-5 shadow-[0_10px_28px_rgba(47,70,54,0.08)] sm:mt-12 sm:rounded-[32px] sm:px-7 sm:py-7">
        <div className="flex items-center gap-2 text-sm font-medium text-ink">
          <MessageCircle size={17} className="text-accent" strokeWidth={1.8}/>現在想說什麼？
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {quickStates.map(state => (
            <button
              key={state.id}
              type="button"
              onClick={() => handleQuickState(state)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                activeQuickState === state.id && input === state.draft
                  ? 'border-accent bg-accent text-white'
                  : 'border-border-base bg-surface-subtle text-ink-secondary hover:border-accent/40 hover:text-ink'
              }`}
            >
              {state.label}
            </button>
          ))}
        </div>

        <textarea
          ref={inputRef}
          rows={5}
          value={input}
          onChange={event => {
            setInput(event.target.value);
            if (activeQuickState) setActiveQuickState(null);
          }}
          onKeyDown={event => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              beginConversation();
            }
          }}
          placeholder={UI_TEXT.home.inputPlaceholder}
          className="mt-4 min-h-[140px] w-full resize-none bg-transparent p-0 text-[18px] leading-[1.75] tracking-[-0.025em] text-ink caret-accent outline-none placeholder:text-ink-placeholder sm:min-h-[160px] sm:text-[20px]"
        />

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-base pt-4">
          <p className="text-xs leading-relaxed text-ink-muted">
            {activeQuickState ? '已帶入草稿，可直接送出或修改。' : '先說一句也可以。'}
          </p>
          <button
            type="button"
            disabled={!input.trim()}
            onClick={beginConversation}
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-accent px-5 text-sm font-medium text-white shadow-[0_5px_12px_rgba(47,91,71,0.2)] transition-all hover:-translate-y-px hover:bg-accent-hover active:translate-y-px disabled:cursor-not-allowed disabled:opacity-35"
          >
            <span>開始說說</span>
            <ArrowUp size={16} strokeWidth={2}/>
          </button>
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