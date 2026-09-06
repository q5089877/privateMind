import React, { useEffect, useRef, useState } from 'react';
import { Anchor, ArrowDown, ArrowRight, Check, Heart, History, Loader2, MessageSquare, ShieldCheck, Sprout, Waves } from 'lucide-react';
import { CarryState, Moment } from '../types';
import { UI_TEXT } from '../config/textConfig';
import { cancelHaptics, triggerHaptic } from '../utils/haptics';

interface Props {
  onStartInput: (text: string) => void;
  onReview: () => void;
  onOpenBackup: () => void;
  getContinuityCandidate?: () => Promise<Moment | null>;
  onResolveContinuity?: (momentId: string, state: CarryState | null) => Promise<void>;
}

const quickStates = UI_TEXT.home.quickDrafts;

const TOP_ZEN_IMAGE =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDQh5kyggFcRV0ghkTqK3m7SIK99ukF7z6a5FTVil4LP-8TD4-kuoMAdz--RopIM0pye3Q5xtKf6qy5cHU-HTLHJ1pVKE110QOVp-kPdFCwEzzM3D9QxuPDoyg42Tqje7DpcpxBDnYt5X23O-CjLrbr_GjZV_BpluiJgTKIoqFZna7lHy17bbGJCcDxlaOUqCoqOQW6HlCf_DjxJJZQw0TVAKVNLHgw-xlYjZqBCsTTXk0pUn-3xC4z';

const BOTTOM_MIST_IMAGE =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDrneCCs85P9x9G5eTAmlINWiDqsiJiLM69_JE5LEHCv4VLlRNZVOlSpLg3opTS4WfyRgJR32hJPaKapnA2-yB0cOn-B2bvzMmkhy2WDGY1LkCB82CnB9diQM5qtT_0r46bhMwnrzzikWrJFZcfpV7xNrb9a5U5R_CqN1mavdtrluGt0IQjNeTuMGQalLiftxpCnILyXc8z5z2g8KGjKsy1ZfMlyVJfch4sr2EhqFDec29JcHQBGE2H';

export const HomeScreen: React.FC<Props> = ({
  onStartInput,
  onReview,
  onOpenBackup,
  getContinuityCandidate,
  onResolveContinuity
}) => {
  const [input, setInput] = useState('');
  const [ventCount, setVentCount] = useState(0);
  const [holdProgress, setHoldProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const [isEbbing, setIsEbbing] = useState(false);
  const [isTapping, setIsTapping] = useState(false);
  const [isHeartSustaining, setIsHeartSustaining] = useState(false);
  const [heartBeatPhase, setHeartBeatPhase] = useState(false);
  const [activeQuickState, setActiveQuickState] = useState<string | null>(null);
  const [submittingState, setSubmittingState] = useState<'idle' | 'submitting' | 'settled'>('idle');
  const [continuityMoment, setContinuityMoment] = useState<Moment | null>(null);
  const [continuityDismissed, setContinuityDismissed] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const progressTimerRef = useRef<number | null>(null);
  const holdDelayTimerRef = useRef<number | null>(null);
  const heartbeatLoopTimerRef = useRef<number | null>(null);
  const ebbTimerRef = useRef<number | null>(null);
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

  useEffect(() => {
    if (getContinuityCandidate) {
      void getContinuityCandidate().then(candidate => {
        if (candidate) setContinuityMoment(candidate);
      });
    }
  }, [getContinuityCandidate]);

  const handleContinuityChoice = (choice: CarryState) => {
    if (!continuityMoment) return;
    const id = continuityMoment.id;
    setContinuityDismissed(true);
    if (onResolveContinuity) {
      void onResolveContinuity(id, choice);
    }
    inputRef.current?.focus();
  };

  const clearHold = () => {
    clearTimers();
    if (ebbTimerRef.current) {
      clearTimeout(ebbTimerRef.current);
      ebbTimerRef.current = null;
    }
    setIsHolding(false);
    setIsEbbing(false);
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
    if (ebbTimerRef.current) {
      clearTimeout(ebbTimerRef.current);
      ebbTimerRef.current = null;
      setIsEbbing(false);
    }
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

    // 只要有長按（充飽中或已維持心跳），放開時啟動 360ms 餘韻慣性退潮
    if (isHolding) {
      setVentCount(prev => prev + 1);
      triggerHaptic('release');

      // 立即停止心跳循環與充水計時器，啟動帶物理慣性的退潮過渡
      clearTimers();
      setIsHeartSustaining(false);
      setHeartBeatPhase(false);
      setIsEbbing(true);
      setHoldProgress(0); // 觸發 360ms cubic-bezier 慣性滑落至 0%

      ebbTimerRef.current = window.setTimeout(() => {
        setIsHolding(false);
        setIsEbbing(false);
        ebbTimerRef.current = null;
      }, 360);
      return;
    }

    clearHold();
  };

  const handleQuickState = (state: (typeof quickStates)[number]) => {
    if (activeQuickState === state.id && input === state.text) {
      setActiveQuickState(null);
      setInput('');
    } else {
      setActiveQuickState(state.id);
      setInput(state.text);
    }
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const beginConversation = () => {
    const text = input.trim();
    if (!text || submittingState !== 'idle') return;

    if (continuityMoment && !continuityDismissed && onResolveContinuity) {
      void onResolveContinuity(continuityMoment.id, null);
      setContinuityDismissed(true);
    }

    triggerHaptic('docking');
    setSubmittingState('submitting');
    window.setTimeout(() => {
      setSubmittingState('settled');
      window.setTimeout(() => {
        onStartInput(text);
        setInput('');
        setActiveQuickState(null);
        setSubmittingState('idle');
      }, 450);
    }, 550);
  };

  const trimmedLength = input.trim().length;

  return (
    <div className="w-full max-w-[580px] min-h-[calc(100vh-90px)] px-1 py-4 sm:py-7 flex flex-col space-y-6">
      {/* 全螢幕定錨注水層 (Full-screen Ballast Water & Heartbeat with 360ms Ebb Resonance) */}
      <div
        className={`fixed inset-0 z-50 pointer-events-none transition-opacity duration-360 ease-out ${
          isHolding || isEbbing ? 'opacity-100' : 'opacity-0'
        }`}
        aria-hidden="true"
      >
        <div
          className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-accent/90 via-accent/55 to-transparent backdrop-blur-[6px] transition-[height] ${
            isEbbing
              ? 'duration-360 ease-[cubic-bezier(0.22,1,0.36,1)]'
              : 'duration-150 ease-linear'
          }`}
          style={{ height: `${holdProgress}%` }}
        >
          <div
            className={`absolute inset-x-0 top-0 h-[2px] bg-emerald-300 transition-opacity duration-300 ${
              isEbbing ? 'opacity-0' : 'opacity-100 shadow-[0_0_20px_rgba(188,238,211,0.9)]'
            }`}
          />
          <div
            className={`absolute inset-x-0 top-14 flex flex-col items-center justify-center text-center px-6 transition-all duration-300 ${
              isEbbing ? 'opacity-0 translate-y-3 scale-95' : 'opacity-100 translate-y-0 scale-100'
            }`}
          >
            <span
              className={`flex h-14 w-14 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white shadow-lg backdrop-blur-md transition-transform duration-150 ${
                heartBeatPhase ? 'scale-115' : 'scale-100'
              }`}
            >
              <Heart size={28} className="text-white fill-white/20" />
            </span>
            <p className="mt-4 text-xl sm:text-2xl font-medium text-white tracking-wide">
              {isHeartSustaining ? UI_TEXT.home.vent.sustainedState : '深呼吸，隨心定錨'}
            </p>
            <p className="mt-1 text-xs text-white/80">
              {isHeartSustaining ? UI_TEXT.home.vent.sustainedSubtext : '讓腦海的浪潮在此刻緩下來……'}
            </p>
          </div>
        </div>
      </div>

      {/* 頂部 Header & 定錨按鈕 */}
      <header className="flex items-center justify-between gap-4 pt-1">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent text-white shadow-[0_6px_16px_rgba(19,66,48,0.22)] transition-transform duration-300 active:scale-95">
            <Waves size={24} strokeWidth={1.8} />
          </div>
          <div className="flex flex-col">
            <span className="text-[20px] font-semibold tracking-[-0.03em] text-ink">{UI_TEXT.home.brandTitle}</span>
            <span className="text-[10px] tracking-[0.18em] text-ink-muted uppercase">{UI_TEXT.home.brandSubtitle}</span>
          </div>
        </div>

        <div className="flex flex-col items-end">
          <button
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            onPointerLeave={clearHold}
            onPointerCancel={clearHold}
            onContextMenu={e => e.preventDefault()}
            className={`group relative flex h-11 items-center gap-2 rounded-full bg-surface px-4 shadow-[0_1px_4px_rgba(0,0,0,0.05)] border border-border-base/70 select-none touch-none transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0.5 active:scale-95 cursor-pointer ${
              isTapping ? 'scale-90 border-accent bg-accent/10' : ''
            }`}
            title="按住隨心跳定錨呼吸"
            type="button"
          >
            <Anchor size={17} className={`text-accent transition-transform duration-300 ${isHolding ? 'rotate-12 scale-110' : 'group-hover:rotate-12'}`} />
            <span className="text-sm font-medium text-ink whitespace-nowrap">定錨</span>
            <span className="rounded-full bg-paper-sunken px-2 py-0.5 text-[10px] font-mono text-ink-muted">
              {isHolding ? (isHeartSustaining ? '已定錨' : `${Math.round(holdProgress)}%`) : '長按'}
            </span>
          </button>
          {ventCount > 0 && (
            <span className="mt-1 text-[11px] text-ink-muted">
              {UI_TEXT.home.vent.counterPrefix} {ventCount} {UI_TEXT.home.vent.counterSuffix}
            </span>
          )}
        </div>
      </header>

      {/* 頂部靜謐寫真切片 (Visual Calm Vignette) */}
      <div className="relative w-full h-24 rounded-2xl overflow-hidden shadow-xs border border-border-base/50">
        <img
          src={TOP_ZEN_IMAGE}
          alt="靜謐時光"
          className="w-full h-full object-cover brightness-[0.98]"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-canvas via-canvas/75 to-transparent flex items-center px-4.5">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent/60 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-accent" />
            </span>
            <span className="text-sm font-medium text-accent tracking-wide">現在這一刻，是安靜的</span>
          </div>
        </div>
      </div>

      {/* 核心標題引導 */}
      <section className="flex flex-col space-y-2 px-1">
        <h1 className="text-[28px] sm:text-[36px] font-medium tracking-[-0.04em] text-ink leading-tight">
          把卡在心裡的事，<br />先說出來。
        </h1>
        <p className="text-[15px] sm:text-[16px] leading-relaxed text-ink-secondary max-w-[420px]">
          不用整理，也不用現在就有答案。先從最想說的那一句開始。
        </p>
      </section>

      {/* 跨次承接感極簡探針 (Continuity Sensitivity Probe) */}
      {continuityMoment && !continuityDismissed && (
        <section className="w-full rounded-2xl bg-surface border border-accent/20 p-4.5 shadow-[0_2px_12px_rgba(19,66,48,0.05)] transition-all duration-300">
          <p className="text-[15.5px] font-medium text-ink leading-relaxed">
            「{continuityMoment.content.length > 22 ? continuityMoment.content.slice(0, 22) + '…' : continuityMoment.content}」，還在嗎？
          </p>
          <div className="mt-3.5 flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleContinuityChoice('still')}
              className="px-4 py-1.5 rounded-full bg-accent text-white text-xs font-medium shadow-xs hover:bg-accent-hover active:scale-95 transition-all cursor-pointer"
            >
              還在
            </button>
            <button
              type="button"
              onClick={() => handleContinuityChoice('faded')}
              className="px-3.5 py-1.5 rounded-full bg-surface-subtle text-ink-secondary border border-border-base text-xs font-medium hover:bg-surface-hover active:scale-95 transition-all cursor-pointer"
            >
              不在了
            </button>
            <button
              type="button"
              onClick={() => handleContinuityChoice('dont_ask')}
              className="px-2.5 py-1 text-xs text-ink-muted hover:text-ink transition-colors ml-auto cursor-pointer"
            >
              先不提
            </button>
          </div>
        </section>
      )}

      {/* 核心輸入卡片 (Core Expression Card) */}
      <section className="relative rounded-3xl bg-surface p-5 sm:p-7 shadow-[0_8px_24px_rgba(36,40,38,0.06)] border border-border-base/80 transition-all duration-300">
        <div className="flex items-center justify-between pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/12 text-accent">
              <MessageSquare size={15} strokeWidth={2} />
            </div>
            <span className="text-sm font-medium text-ink">{UI_TEXT.home.sectionTitle}</span>
          </div>
          <span className="text-[11px] font-mono text-ink-muted">
            {trimmedLength > 0 ? `${trimmedLength} 字已注入` : '準備傾聽'}
          </span>
        </div>

        {/* 6 態心情膠囊 */}
        <div className="flex flex-wrap gap-2 pt-1 pb-3.5">
          {quickStates.map(state => {
            const isSelected = activeQuickState === state.id && input === state.text;
            return (
              <button
                key={state.id}
                type="button"
                onClick={() => handleQuickState(state)}
                className={`min-h-[32px] px-3.5 rounded-full text-xs font-medium transition-all cursor-pointer active:scale-95 ${
                  isSelected
                    ? 'bg-accent text-white shadow-xs'
                    : 'bg-paper-sunken text-ink-secondary hover:text-ink hover:bg-surface-hover'
                }`}
              >
                {state.label}
              </button>
            );
          })}
        </div>

        {/* 文字輸入區 */}
        <div className="relative py-1">
          <textarea
            ref={inputRef}
            rows={5}
            value={input}
            onChange={e => {
              setInput(e.target.value);
              if (activeQuickState) setActiveQuickState(null);
            }}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                beginConversation();
              }
            }}
            placeholder={UI_TEXT.home.inputPlaceholder}
            className="w-full resize-none bg-transparent p-0 text-[17px] sm:text-[19px] leading-[1.7] text-ink placeholder:text-ink-placeholder focus:outline-none caret-accent"
          />
        </div>

        {/* 卡片底部操作列 */}
        <div className="mt-3 pt-3 flex flex-wrap items-center justify-between gap-3 border-t border-border-base/60">
          <div className="flex items-center gap-1.5 text-xs text-ink-muted">
            <Sprout size={14} className="text-accent" />
            <p>{activeQuickState ? UI_TEXT.home.inputHintDraft : UI_TEXT.home.inputHintDefault}</p>
          </div>

          <button
            type="button"
            disabled={!input.trim() || submittingState !== 'idle'}
            onClick={beginConversation}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-accent px-5 text-sm font-medium text-white shadow-[0_4px_12px_rgba(19,66,48,0.22)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-accent-hover active:translate-y-0.5 active:scale-95 disabled:opacity-35 disabled:pointer-events-none cursor-pointer"
          >
            {submittingState === 'submitting' ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>正在安放……</span>
              </>
            ) : submittingState === 'settled' ? (
              <>
                <Check size={16} />
                <span>已安穩停靠</span>
              </>
            ) : (
              <>
                <span>{UI_TEXT.home.submitBtn}</span>
                <ArrowDown size={16} strokeWidth={2} />
              </>
            )}
          </button>
        </div>
      </section>

      {/* 溫暖承諾提示 */}
      <p className="px-2 text-sm leading-relaxed text-ink-secondary">
        {UI_TEXT.home.footerPromise}
      </p>

      {/* 導航與本機保證區 */}
      <nav className="flex flex-col space-y-3 pt-1">
        {/* 回看卡片 */}
        <button
          onClick={onReview}
          type="button"
          className="group flex min-h-[56px] w-full items-center justify-between gap-3 rounded-2xl bg-surface px-4 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.03)] border border-border-base/70 transition-all hover:bg-surface-subtle hover:shadow-xs active:scale-[0.99] text-left cursor-pointer"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/12 text-accent">
              <History size={18} strokeWidth={2} />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-medium text-ink truncate">{UI_TEXT.home.reviewPast}</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
                <span className="text-xs text-ink-muted truncate">存於本機</span>
              </div>
            </div>
          </div>
          <ArrowRight size={16} className="text-ink-muted transition-transform group-hover:translate-x-1" />
        </button>

        {/* 隱私保證膠囊 */}
        <div
          onClick={onOpenBackup}
          className="flex items-center gap-2.5 rounded-xl bg-paper-sunken px-3.5 py-2.5 text-xs text-ink-secondary border border-border-base/50 cursor-pointer hover:text-ink transition-colors"
        >
          <ShieldCheck size={16} className="text-accent shrink-0" />
          <span className="flex-1 leading-relaxed">
            {UI_TEXT.home.backup}・不聯網・無帳號・完全無痕安全
          </span>
        </div>
      </nav>

      {/* 底部晨霧松林照片切片 (Grounding Photo Slice) */}
      <div className="w-full rounded-2xl overflow-hidden shadow-xs relative h-28 my-1 border border-border-base/50">
        <img
          src={BOTTOM_MIST_IMAGE}
          alt="晨霧松林"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-accent/80 via-accent/20 to-transparent flex items-end p-3.5">
          <p className="text-xs font-medium text-white/95 tracking-wide">
            「允許每一種狀態存在，也是給自己的寬容。」
          </p>
        </div>
      </div>
    </div>
  );
};