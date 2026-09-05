import React, { useEffect, useRef, useState } from 'react';
import { Anchor, ArrowUp, History, MessageCircle, ShieldCheck, Waves } from 'lucide-react';
import { UI_TEXT } from '../config/textConfig';
import { cancelHaptics, triggerHaptic } from '../utils/haptics';

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
  const [isTapping, setIsTapping] = useState(false);
  const [isHeartSustaining, setIsHeartSustaining] = useState(false);
  const [heartBeatPhase, setHeartBeatPhase] = useState(false);
  const [activeQuickState, setActiveQuickState] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const progressTimerRef = useRef<number | null>(null);
  const holdDelayTimerRef = useRef<number | null>(null);
  const heartbeatLoopTimerRef = useRef<number | null>(null);
  const pressStartTimeRef = useRef<number>(0);

  const clearTimers = () => {
    if (holdDelayTimerRef.current) {
      clearTimeout(holdDelayTimerRef.current);
      holdDelayTimerRef.current = null;
    }
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
    if (heartbeatLoopTimerRef.current) {
      clearInterval(heartbeatLoopTimerRef.current);
      heartbeatLoopTimerRef.current = null;
    }
  };

  useEffect(() => {
    inputRef.current?.focus();
    return () => {
      clearTimers();
      cancelHaptics();
    };
  }, []);

  const clearHold = () => {
    clearTimers();
    setIsHolding(false);
    setIsHeartSustaining(false);
    setHeartBeatPhase(false);
    setHoldProgress(0);
    setIsTapping(false);
  };

  const triggerBeatPulse = () => {
    triggerHaptic('heartbeat');
    setHeartBeatPhase(true);
    window.setTimeout(() => setHeartBeatPhase(false), 240);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    clearTimers();
    pressStartTimeRef.current = Date.now();
    triggerHaptic('unlatch');
    setIsTapping(true);

    // 延遲 240ms：若 240ms 內放開，判定為純「輕點 (Tap)」；持續按住超過 240ms 啟動全螢幕注水與平靜心跳
    holdDelayTimerRef.current = window.setTimeout(() => {
      setIsHolding(true);
      setHoldProgress(0);
      setIsHeartSustaining(false);

      // 立即敲擊第一下平靜心跳
      triggerBeatPulse();

      // 每 1000ms（~60 BPM，深沉平靜生理心率）維持心跳循環
      heartbeatLoopTimerRef.current = window.setInterval(() => {
        triggerBeatPulse();
      }, 1000);

      const duration = 2500; // 2.5 秒注水充飽
      const interval = 30; // 30ms 刷新
      const step = (interval / duration) * 100;
      let current = 0;

      progressTimerRef.current = window.setInterval(() => {
        current += step;
        if (current >= 100) {
          current = 100;
          setHoldProgress(100);
          setIsHeartSustaining(true);
          clearInterval(progressTimerRef.current!);
          progressTimerRef.current = null;
          // 水滿後不自動中斷！持續維持 heartbeatLoopTimerRef 直到使用者手指放開
          return;
        }
        setHoldProgress(current);
      }, interval);
    }, 240);
  };

  const handlePointerUp = () => {
    const pressDuration = Date.now() - pressStartTimeRef.current;
    window.setTimeout(() => setIsTapping(false), 120);

    // 小於 240ms：純輕點（戳戳樂模式）
    if (pressDuration < 240) {
      clearTimers();
      setVentCount(prev => prev + 1);
      return;
    }

    // 只要有長按（無論是充飽中或已持續滿水心跳），放開時均計入一次沉澱定錨
    if (isHolding) {
      setVentCount(prev => prev + 1);
      triggerHaptic('release');
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
    {/* 全螢幕定錨注水層 (Full-screen Ballast Water & Heartbeat) */}
    <div
      className={`fixed inset-0 z-50 pointer-events-none transition-opacity duration-300 ${
        isHolding || holdProgress > 0 ? 'opacity-100' : 'opacity-0'
      }`}
      aria-hidden="true"
    >
      {/* 湧升深水層 */}
      <div
        className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-accent/80 via-accent/50 to-accent/20 backdrop-blur-[4px] transition-[height] duration-75 ease-linear"
        style={{ height: `${holdProgress}%` }}
      >
        {/* 潮水頂部發光水線 */}
        <div className="absolute inset-x-0 top-0 h-1 bg-white/40 shadow-[0_0_16px_rgba(255,255,255,0.7)]" />
      </div>

      {/* 核心定心錨 ⚓ 與生理心跳共振進度 */}
      {(isHolding || holdProgress > 0) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center select-none">
          <div
            className="flex flex-col items-center gap-5 transition-transform duration-100"
            style={{
              transform: `scale(${heartBeatPhase ? 1.08 : 1.0})`
            }}
          >
            <span className={`flex h-24 w-24 items-center justify-center rounded-full border shadow-[0_16px_40px_rgba(20,40,30,0.35)] backdrop-blur-md transition-all duration-300 ${
              isHeartSustaining
                ? 'border-white bg-accent text-white shadow-[0_0_35px_rgba(255,255,255,0.5)]'
                : 'border-accent/40 bg-surface/90 text-accent'
            }`}>
              <Anchor
                size={48}
                strokeWidth={1.8}
                className={`transition-transform duration-150 ${
                  heartBeatPhase ? 'scale-115' : 'scale-100'
                }`}
              />
            </span>

            <div className="space-y-1 drop-shadow-md">
              <p className="text-xl font-medium tracking-tight text-white sm:text-2xl">
                {isHeartSustaining ? UI_TEXT.home.vent.sustainedState : UI_TEXT.home.vent.holdingState}
              </p>
              <p className="font-mono text-sm tracking-widest text-white/80">
                {isHeartSustaining ? UI_TEXT.home.vent.sustainedSubtext : `${Math.round(holdProgress)}%`}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>

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
          className={`group relative flex h-11 items-center gap-2 rounded-full border px-3.5 text-xs font-medium shadow-xs select-none touch-none transition-all duration-100 ${
            isTapping ? 'scale-90 border-accent bg-accent/15' : 'border-accent/30 bg-surface active:scale-95'
          }`}
          title={UI_TEXT.home.vent.buttonTitle}
        >
          <Anchor size={17} className={`text-accent transition-transform duration-200 ${isHolding ? 'scale-115 text-accent-hover' : isTapping ? 'scale-90 rotate-[-10deg]' : 'group-hover:scale-110'}`} />
          <span className="text-[13px] font-medium tracking-wide text-ink whitespace-nowrap">
            {UI_TEXT.home.vent.buttonLabel}
          </span>
          <span className="text-[10px] font-mono text-ink-muted whitespace-nowrap">
            {isHolding ? (isHeartSustaining ? '已定錨' : `${Math.round(holdProgress)}%`) : UI_TEXT.home.vent.idleHint}
          </span>
        </button>
        {ventCount > 0 && (
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
          <MessageCircle size={17} className="text-accent" strokeWidth={1.8}/>{UI_TEXT.home.sectionTitle}
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
            {activeQuickState ? UI_TEXT.home.inputHintDraft : UI_TEXT.home.inputHintDefault}
          </p>
          <button
            type="button"
            disabled={!input.trim()}
            onClick={beginConversation}
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-accent px-5 text-sm font-medium text-white shadow-[0_5px_12px_rgba(47,91,71,0.2)] transition-all hover:-translate-y-px hover:bg-accent-hover active:translate-y-px disabled:cursor-not-allowed disabled:opacity-35"
          >
            <span>{UI_TEXT.home.submitBtn}</span>
            <ArrowUp size={16} strokeWidth={2}/>
          </button>
        </div>
      </section>

      <p className="mt-4 px-2 text-sm leading-relaxed text-ink-secondary">{UI_TEXT.home.footerPromise}</p>
    </main>

    <nav className="mt-10 border-t border-border-base pt-5 sm:mt-14">
      <button type="button" onClick={onReview} className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl px-2 text-left text-[16px] text-ink-secondary transition-colors hover:bg-surface-subtle hover:text-ink"><span className="flex items-center gap-3"><History size={19} strokeWidth={1.7}/>{UI_TEXT.home.reviewPast}</span><span aria-hidden="true" className="text-ink-muted">→</span></button>
      <button type="button" onClick={onOpenBackup} className="mt-2 flex min-h-9 items-center gap-2 px-2 text-[13px] text-ink-muted transition-colors hover:text-ink"><ShieldCheck size={15} className="text-accent"/>{UI_TEXT.home.backup}</button>
    </nav>
  </div>;
};