import React, { useEffect, useRef, useState } from 'react';
import { ArrowUp, History, MessageCircle, ShieldCheck, Waves } from 'lucide-react';
import { UI_TEXT } from '../config/textConfig';
import { triggerHaptic } from '../utils/haptics';

interface Props {
  onStartInput: (text: string) => void;
  onReview: () => void;
  onOpenBackup: () => void;
}

const quickStates = UI_TEXT.home.quickDrafts;
const ventWords = UI_TEXT.home.pulseWords;

export const HomeScreen: React.FC<Props> = ({ onStartInput, onReview, onOpenBackup }) => {
  const [input, setInput] = useState('');
  const [ventCount, setVentCount] = useState(0);
  const [holdProgress, setHoldProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const [activeQuickState, setActiveQuickState] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const progressTimerRef = useRef<number | null>(null);
  const lastHapticStepRef = useRef<number>(0);

  useEffect(() => {
    inputRef.current?.focus();
    return () => {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    };
  }, []);

  const clearHold = () => {
    setIsHolding(false);
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
    setHoldProgress(0);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    setIsHolding(true);
    setHoldProgress(0);
    lastHapticStepRef.current = 0;
    triggerHaptic('unlatch');

    const duration = 2200; // 2.2 秒充飽
    const interval = 30; // 30ms 步進
    const step = (interval / duration) * 100;
    let current = 0;

    if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    progressTimerRef.current = window.setInterval(() => {
      current += step;
      if (current >= 100) {
        current = 100;
        setHoldProgress(100);
        clearInterval(progressTimerRef.current!);
        progressTimerRef.current = null;
        triggerHaptic('docking');
        setVentCount(prev => prev + 1);
        window.setTimeout(() => {
          setIsHolding(false);
          setHoldProgress(0);
        }, 320);
        return;
      }
      setHoldProgress(current);

      const stepIndex = Math.floor(current / 20);
      if (stepIndex > lastHapticStepRef.current) {
        lastHapticStepRef.current = stepIndex;
        triggerHaptic('unlatch');
      }
    }, interval);
  };

  const handlePointerUp = () => {
    if (!isHolding) return;
    if (holdProgress > 15 && holdProgress < 100) {
      setVentCount(prev => prev + 1);
    }
    clearHold();
  };

  const handleQuickState = (state: (typeof quickStates)[number]) => {
    setActiveQuickState(state.id);
    setInput(state.text);
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
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerLeave={clearHold}
          onPointerCancel={clearHold}
          onContextMenu={e => e.preventDefault()}
          className="group relative flex h-11 w-[144px] items-center justify-between overflow-hidden rounded-full border border-accent/30 bg-surface px-3.5 text-xs font-medium shadow-xs transition-all select-none touch-none active:scale-[0.98]"
          title="按住消波"
        >
          {/* 能量條填充層 */}
          <div
            className="absolute inset-y-0 left-0 bg-accent/20 transition-[width] duration-75 ease-linear pointer-events-none"
            style={{ width: `${holdProgress}%` }}
          />

          <div className="relative z-10 flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className={`absolute inline-flex h-full w-full rounded-full bg-accent/40 ${isHolding ? 'animate-ping' : ''}`}></span>
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-accent"></span>
            </span>
            <span className="text-[13px] font-medium tracking-wide text-ink whitespace-nowrap">
              {UI_TEXT.home.vent.buttonLabel}
            </span>
          </div>

          <span className="relative z-10 text-[10px] font-mono text-ink-muted whitespace-nowrap">
            {isHolding ? `${Math.round(holdProgress)}%` : UI_TEXT.home.vent.idleHint}
          </span>
        </button>
        {ventCount >= 3 && (
          <span className="mt-1.5 text-[11px] text-ink-muted transition-opacity">
            {UI_TEXT.home.vent.counterPrefix} {ventCount} {UI_TEXT.home.vent.counterSuffix}
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
                activeQuickState === state.id && input === state.text
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