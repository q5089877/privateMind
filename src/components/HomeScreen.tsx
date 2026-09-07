import React, { useEffect, useRef, useState } from 'react';
import { Anchor, ArrowDown, ArrowRight, Check, Heart, History, Loader2, MessageSquare, ShieldCheck, Sprout, Waves } from 'lucide-react';
import { DailyAnchorStats, Moment, PersistenceState } from '../types';
import { UI_TEXT } from '../config/textConfig';
import { cancelHaptics, triggerHaptic } from '../utils/haptics';
import { CRISIS_RESOURCES, evaluateSafetyRisk, SafetyEvaluation } from '../services/ai/roles/safetyRoute';

import topZenImage from '../assets/zen-stones.jpg';
import bottomMistImage from '../assets/mist-forest.jpg';

const TOP_ZEN_IMAGE = topZenImage;
const BOTTOM_MIST_IMAGE = bottomMistImage;

interface Props {
  onStartInput: (text: string) => Promise<void>;
  onReview: () => void;
  onOpenBackup: () => void;
  /** Jump directly to Chat for this moment's session */
  /** Transient: non-null when a Moment was just docked. */
  dockedMoment?: Moment | null;
  /** User chose "接著說" on the docked card → navigate to CHAT. */
  onOpenChat?: () => void;
  /** User explicitly chose to seal this docked moment. */
  onBeginLanding?: (momentId: string) => Promise<void>;
  /** Auto-dismiss or ignored → clear dockedMoment, stay HOME. */
  onDismissDockedMoment?: () => void;
  /** Honest local storage status */
  persistenceState?: PersistenceState;
  getTodayAnchorStats?: () => Promise<DailyAnchorStats>;
  onRecordAnchorEvent?: (type: 'tap' | 'hold', durationMs?: number) => Promise<DailyAnchorStats>;
}

const quickStates = UI_TEXT.home.quickDrafts;

export const HomeScreen: React.FC<Props> = ({
  onStartInput,
  onReview,
  onOpenBackup,
  dockedMoment,
  onOpenChat,
  onBeginLanding,
  onDismissDockedMoment,
  persistenceState = 'persisted',
  getTodayAnchorStats,
  onRecordAnchorEvent
}) => {
  const [input, setInput] = useState('');
  const [isInputFocused, setIsInputFocused] = useState(false);

  const [safetyCheck, setSafetyCheck] = useState<SafetyEvaluation | null>(null);
  const [showCrisisHelp, setShowCrisisHelp] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const [isEbbing, setIsEbbing] = useState(false);
  const [ebbPhase, setEbbPhase] = useState<'ending' | 'done' | null>(null);
  const [isTapping, setIsTapping] = useState(false);
  const [isHeartSustaining, setIsHeartSustaining] = useState(false);
  const [heartBeatPhase, setHeartBeatPhase] = useState(false);
  const [activeQuickState, setActiveQuickState] = useState<string | null>(null);
  const [submittingState, setSubmittingState] = useState<'idle' | 'submitting' | 'settled'>('idle');

  const [todayAnchorStats, setTodayAnchorStats] = useState<DailyAnchorStats>({ tapCount: 0, holdCount: 0 });

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const progressTimerRef = useRef<number | null>(null);
  const holdDelayTimerRef = useRef<number | null>(null);
  const heartbeatLoopTimerRef = useRef<number | null>(null);
  const ebbTimerRef = useRef<number | null>(null);
  const pressStartTimeRef = useRef<number>(0);
  const holdActivatedRef = useRef(false);
  const pendingDismissTimerRef = useRef<number | null>(null);
  const lastHandledDockedIdRef = useRef<string | null>(null);

  const clearTimers = () => {
    if (holdDelayTimerRef.current) clearTimeout(holdDelayTimerRef.current);
    if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    if (heartbeatLoopTimerRef.current) clearInterval(heartbeatLoopTimerRef.current);
    if (ebbTimerRef.current) clearTimeout(ebbTimerRef.current);
  };

  useEffect(() => {
    inputRef.current?.focus();
    return () => {
      clearTimers();
      cancelHaptics();
      if (pendingDismissTimerRef.current) clearTimeout(pendingDismissTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (getTodayAnchorStats) void getTodayAnchorStats().then(setTodayAnchorStats);
  }, [getTodayAnchorStats]);



  // The docked card is static on HOME; AI begins only after explicit navigation.


  // The confirmation card is intentionally persistent. Only an explicit user
  // action (new input, continue, explore, or close) may dismiss it.
  const triggerDockedDismiss = (_immediate = true) => {
    if (!dockedMoment || !onDismissDockedMoment) return;
    onDismissDockedMoment();
  };



  const clearHold = () => {
    holdActivatedRef.current = false;
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
    holdActivatedRef.current = false;
    if (e.button !== 0) return;
    triggerDockedDismiss(true); // 任何新動作立即清除 docked card
    clearTimers();
    if (ebbTimerRef.current) {
      clearTimeout(ebbTimerRef.current);
      ebbTimerRef.current = null;
      setIsEbbing(false);
    }
    pressStartTimeRef.current = Date.now();
    triggerHaptic('unlatch');
    setIsTapping(true);

    holdDelayTimerRef.current = window.setTimeout(() => {
      holdActivatedRef.current = true;
      setIsHolding(true);
      setHoldProgress(0);
      setIsHeartSustaining(false);
      triggerBeatPulse();

      heartbeatLoopTimerRef.current = window.setInterval(() => {
        triggerBeatPulse();
      }, 1000);

      const duration = 2500;
      const interval = 30;
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
          return;
        }
        setHoldProgress(current);
      }, interval);
    }, 240);
  };

  const handlePointerUp = () => {
    const pressDuration = Date.now() - pressStartTimeRef.current;
    window.setTimeout(() => setIsTapping(false), 120);

    if (pressDuration < 240) {
      clearTimers();
      if (onRecordAnchorEvent) void onRecordAnchorEvent('tap').then(setTodayAnchorStats);
      return;
    }

    if (holdActivatedRef.current) {
      holdActivatedRef.current = false;
      if (onRecordAnchorEvent) void onRecordAnchorEvent('hold', pressDuration).then(setTodayAnchorStats);
      triggerHaptic('release');
      clearTimers();
      setIsHeartSustaining(false);
      setHeartBeatPhase(false);
      setIsEbbing(true);
      setHoldProgress(0); 

      ebbTimerRef.current = window.setTimeout(() => {
        setIsHolding(false);
        setIsEbbing(false);
        triggerHaptic('settle'); 
        setEbbPhase('ending'); 
        ebbTimerRef.current = window.setTimeout(() => {
          setEbbPhase('done'); 
          ebbTimerRef.current = null;
        }, 1200);
      }, 2000);
      return;
    }

    clearHold();
  };

  const handleQuickState = (state: (typeof quickStates)[number]) => {
    triggerDockedDismiss(true);
    if (activeQuickState === state.id && input === state.text) {
      setActiveQuickState(null);
      setInput('');
    } else {
      setActiveQuickState(state.id);
      setInput(state.text);
    }
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const beginConversation = async () => {
    triggerDockedDismiss(true); 
    const text = input.trim();
    if (!text || submittingState !== 'idle') return;

    // 前置生命安全檢測 (依據指引，安全優先於所有零問號憲法)
    const safetyEval = evaluateSafetyRisk(text);
    if (safetyEval.decision === 'imminent_risk') {
      // 依舊落盤，確保不漏掉求助者的真實紀錄
      await onStartInput(text);
      setInput('');
      setActiveQuickState(null);
      setSubmittingState('idle');
      setSafetyCheck(safetyEval);
      setShowCrisisHelp(false);
      return;
    }

    setEbbPhase(null); 

    triggerHaptic('docking');
    setSubmittingState('submitting');
    window.setTimeout(() => {
      setSubmittingState('settled');
      window.setTimeout(async () => {
        await onStartInput(text);
        onOpenChat?.();
        setInput('');
        setActiveQuickState(null);
        setSubmittingState('idle');
      }, 450);
    }, 550);
  };

  const trimmedLength = input.trim().length;

  return (
    <div className="w-full max-w-[580px] min-h-[calc(100vh-90px)] px-1 py-1 sm:py-7 flex flex-col space-y-3 sm:space-y-6">
      <div
        className="fixed inset-0 z-50 pointer-events-none"
        style={{
          opacity: isHolding || isEbbing ? 1 : 0,
          transition: isEbbing ? 'opacity 2000ms ease-out' : 'opacity 200ms ease-out'
        }}
        aria-hidden="true"
      >
        <div
          className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-accent/90 via-accent/55 to-transparent backdrop-blur-[6px]"
          style={{
            height: `${holdProgress}%`,
            transition: isEbbing
              ? 'height 2000ms cubic-bezier(0.16, 1, 0.3, 1)'
              : 'height 150ms linear'
          }}
        >
          <div
            className="absolute inset-x-0 top-0 h-[2px] bg-emerald-300"
            style={{
              opacity: isEbbing ? 0 : 1,
              boxShadow: isEbbing ? 'none' : '0 0 20px rgba(188,238,211,0.9)',
              transition: 'opacity 1200ms ease-out'
            }}
          />
          <div
            className="absolute inset-x-0 top-14 flex flex-col items-center justify-center text-center px-6"
            style={{
              opacity: isEbbing ? 0 : 1,
              transform: isEbbing ? 'translateY(16px) scale(0.96)' : 'translateY(0px) scale(1)',
              transition: isEbbing ? 'opacity 1500ms ease-out, transform 1500ms ease-out' : 'none'
            }}
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

      <header className="flex items-center justify-between gap-3 pt-0.5 sm:pt-1">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl bg-accent text-white shadow-[0_4px_12px_rgba(19,66,48,0.2)] transition-transform duration-300 active:scale-95">
            <Waves size={20} strokeWidth={1.8} className="sm:w-6 sm:h-6" />
          </div>
          <div className="flex flex-col">
            <span className="text-[17px] sm:text-[20px] font-semibold tracking-[-0.03em] text-ink leading-tight">{UI_TEXT.home.brandTitle}</span>
            <span className="text-[9px] sm:text-[10px] tracking-[0.18em] text-ink-muted uppercase">{UI_TEXT.home.brandSubtitle}</span>
          </div>
        </div>

        <div className="flex flex-col items-end">
          <div className="relative">
            {!isHolding && !isTapping && (
              <div className="absolute inset-0 rounded-full bg-accent/20 animate-ping" style={{ animationDuration: '3s', opacity: 0.4 }} />
            )}
            <button
              onPointerDown={handlePointerDown}
              onPointerUp={handlePointerUp}
              onPointerLeave={clearHold}
              onPointerCancel={clearHold}
              onContextMenu={e => e.preventDefault()}
              className={`group relative flex h-11 sm:h-14 items-center gap-2 sm:gap-3 rounded-full px-4 sm:px-6 select-none touch-none transition-all duration-300 cursor-pointer border-2 ${
                isHolding
                  ? 'bg-accent border-accent text-white shadow-[0_4px_24px_rgba(19,66,48,0.45)] scale-105'
                  : isTapping
                    ? 'bg-accent/10 border-accent scale-95'
                    : 'bg-surface border-accent/60 hover:border-accent hover:bg-accent/5 hover:-translate-y-0.5 shadow-[0_4px_12px_rgba(19,66,48,0.15)]'
              }`}
              title="按住隨心跳定錨呼吸"
              type="button"
            >
              <Anchor
                size={18}
                strokeWidth={2.2}
                className={`transition-all duration-300 sm:w-[22px] sm:h-[22px] ${
                  isHolding ? 'text-white rotate-12 scale-110' : 'text-accent group-hover:rotate-12'
                }`}
              />
              <span className={`text-[14px] sm:text-[15px] font-semibold whitespace-nowrap transition-colors duration-200 ${isHolding ? 'text-white' : 'text-ink'}`}>
                定錨
              </span>
              <span className={`rounded-full px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-[11px] font-mono transition-colors duration-200 ${
                isHolding ? 'bg-white/20 text-white' : 'bg-paper-sunken text-ink-muted'
              }`}>
                {isHolding ? (isHeartSustaining ? '已定錨' : '定錨中') : '長按'}
              </span>
            </button>
          </div>
          <p className="mt-1 text-[10px] sm:text-[11px] tabular-nums text-ink-muted">今天輕點 {todayAnchorStats.tapCount} 次 · 定錨 {todayAnchorStats.holdCount} 次</p>
        </div>
      </header>

      <div className="relative w-full h-14 sm:h-24 rounded-xl sm:rounded-2xl overflow-hidden shadow-xs border border-border-base/50">
        <img
          src={TOP_ZEN_IMAGE}
          alt="靜謐時光"
          className="w-full h-full object-cover brightness-[0.98]"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-canvas via-canvas/75 to-transparent flex items-center px-3.5 sm:px-4.5">
          <div className="flex items-center gap-2 sm:gap-2.5">
            <span className="relative flex h-2 sm:h-2.5 w-2 sm:w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent/60 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 sm:h-2.5 w-2 sm:w-2.5 bg-accent" />
            </span>
            <span className="text-[12.5px] sm:text-sm font-medium text-accent tracking-wide">現在這一刻，是安靜的</span>
          </div>
        </div>
      </div>

      <section className="flex flex-col space-y-0.5 sm:space-y-2 px-1">
        <h1 className="text-[21px] sm:text-[36px] font-medium tracking-[-0.03em] text-ink leading-snug">
          把卡在心裡的事，先說出來。
        </h1>
        <p className="text-[13px] sm:text-[16px] leading-relaxed text-ink-secondary max-w-[420px]">
          不用整理，也不用現在就有答案。先從最想說的那一句開始。
        </p>
      </section>

      {/* Safety Route Crisis Intervention Card (突破零問號憲法，安全第一) */}
      {safetyCheck && (
        <section className="w-full rounded-2xl bg-amber-500/10 border-2 border-amber-500/40 p-5 shadow-lg animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-2 mb-2 text-amber-800 dark:text-amber-200">
            <ShieldCheck size={18} className="text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="font-semibold text-sm">安全確認</span>
          </div>
          <p className="text-[15px] font-medium text-ink leading-relaxed">
            這句話可能表示你現在不只是心煩。我需要先確認你此刻是否安全。
          </p>
          
          {!showCrisisHelp ? (
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSafetyCheck(null)}
                className="px-4 py-2 rounded-full bg-accent text-white text-xs font-medium hover:bg-accent-hover active:scale-95 transition-all cursor-pointer shadow-xs"
              >
                我目前安全
              </button>
              <button
                type="button"
                onClick={() => setShowCrisisHelp(true)}
                className="px-4 py-2 rounded-full bg-red-600 text-white text-xs font-medium hover:bg-red-700 active:scale-95 transition-all cursor-pointer shadow-xs"
              >
                我可能會傷害自己
              </button>
              <button
                type="button"
                onClick={() => setSafetyCheck(null)}
                className="px-3.5 py-2 rounded-full bg-surface-subtle text-ink-secondary border border-border-base text-xs font-medium hover:bg-surface-hover active:scale-95 transition-all cursor-pointer"
              >
                這句不是在說我
              </button>
            </div>
          ) : (
            <div className="mt-4 pt-3 border-t border-amber-500/20 space-y-3">
              <p className="text-xs font-semibold text-red-600 dark:text-red-400">
                請先停一下，讓專業資源接住你。你不需要一個人硬撐：
              </p>
              <div className="space-y-2">
                {CRISIS_RESOURCES.map(r => (
                  <a
                    key={r.contact}
                    href={r.contact.includes('/') ? `tel:${r.contact.split('/')[0].trim()}` : `tel:${r.contact}`}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-surface border border-red-500/30 hover:border-red-500 transition-colors"
                  >
                    <div>
                      <div className="text-xs font-bold text-ink">{r.name}</div>
                      <div className="text-[11px] text-ink-muted">{r.description}</div>
                    </div>
                    <div className="text-sm font-mono font-bold text-red-600 shrink-0 ml-3">
                      {r.contact}
                    </div>
                  </a>
                ))}
              </div>
              <button
                type="button"
                onClick={() => { setSafetyCheck(null); setShowCrisisHelp(false); }}
                className="w-full mt-2 py-2 rounded-xl bg-surface-subtle text-ink-secondary text-xs font-medium hover:text-ink transition-colors text-center cursor-pointer"
              >
                我已經聯繫支援 / 返回首頁
              </button>
            </div>
          )}
        </section>
      )}

      {/* Docked Confirmation Card */}
      {dockedMoment && (
        <section
          style={{
          }}
          className="w-full rounded-2xl bg-surface border border-accent/20 p-4.5 shadow-[0_4px_16px_rgba(19,66,48,0.08)] mb-2 relative overflow-hidden min-h-[96px]"
        >
          <div className="flex items-center gap-2 mb-3">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent/60 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-accent" />
            </span>
            <span className="font-medium text-[13px] text-accent tracking-wide">
              {persistenceState === 'volatile' ? '已暫存於此畫面（關閉可能遺失）' : (UI_TEXT.home.dockedCard?.statusIndicator || '已留下。')}
            </span>
          </div>
          
          {/* 使用者原始輸入（定錨主體，不可侵犯） */}
          <p className="text-[15.5px] text-ink font-medium leading-relaxed whitespace-pre-wrap mb-3">
            「{dockedMoment.content}」
          </p>

          <div className="flex flex-wrap justify-end gap-x-5 gap-y-2 text-[13px] font-medium text-ink-secondary">
            <button
              onClick={() => { triggerDockedDismiss(true); if (onOpenChat) onOpenChat(); }}
              className="hover:text-accent transition-colors cursor-pointer"
            >
              {UI_TEXT.home.dockedCard?.continueLink || '順著這句往下寫'}
            </button>
            <button
              onClick={() => { triggerDockedDismiss(true); if (onBeginLanding && dockedMoment) void onBeginLanding(dockedMoment.id); }}
              className="hover:text-accent transition-colors cursor-pointer"
            >
              封裝存檔
            </button>
            <button type="button" onClick={() => triggerDockedDismiss(true)} className="text-ink-muted hover:text-ink transition-colors cursor-pointer">
              結束這次停靠
            </button>
          </div>
        </section>
      )}

      {ebbPhase !== null && !dockedMoment && (
        <div
          style={{
            opacity: ebbPhase !== null ? 1 : 0,
            transform: ebbPhase !== null ? 'translateY(0px)' : 'translateY(8px)',
            transition: 'opacity 800ms ease-out, transform 800ms ease-out',
            pointerEvents: 'none'
          }}
        >
          <p
            className="px-1 text-[13px] text-center tracking-wide leading-relaxed transition-colors duration-1000"
            style={{
              color: ebbPhase === 'ending' ? 'var(--color-ink)' : 'var(--color-ink-muted)'
            }}
          >
            {ebbPhase === 'ending' ? '好。' : '想留一句的話，就寫在這裡。'}
          </p>
        </div>
      )}

      <section className="relative rounded-2xl sm:rounded-3xl bg-surface p-4 sm:p-7 shadow-[0_4px_20px_rgba(36,40,38,0.05)] border border-border-base/80 transition-all duration-300">
        <div className="flex items-center justify-between pb-2.5 sm:pb-3">
          <div className="flex items-center gap-2 sm:gap-2.5">
            <div className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-full bg-accent/12 text-accent">
              <MessageSquare size={14} strokeWidth={2} className="sm:w-[15px] sm:h-[15px]" />
            </div>
            <span className="text-[13.5px] sm:text-sm font-medium text-ink">{UI_TEXT.home.sectionTitle}</span>
          </div>
          <span className="text-[10.5px] sm:text-[11px] font-mono text-ink-muted">
            {trimmedLength > 0 ? `${trimmedLength} 字已注入` : '準備傾聽'}
          </span>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5 pb-2.5 sm:flex-wrap sm:gap-2">
          {quickStates.map(state => {
            const isSelected = activeQuickState === state.id && input === state.text;
            return (
              <button
                key={state.id}
                type="button"
                onClick={() => handleQuickState(state)}
                className={`shrink-0 min-h-[44px] px-3 sm:px-3.5 rounded-full text-[11.5px] sm:text-xs font-medium transition-all cursor-pointer active:scale-95 ${
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

        <div className="relative py-0.5 sm:py-1">
          <textarea
            ref={inputRef}
            rows={3}
            value={input}
            onFocus={() => {
              setIsInputFocused(true);

            }}
            onBlur={() => {
              setIsInputFocused(false);
            }}
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
                <span>已安放</span>
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

      <p className="px-2 text-sm leading-relaxed text-ink-secondary">
        {UI_TEXT.home.footerPromise}
      </p>

      <nav className="flex flex-col space-y-3 pt-1">
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
                <span className="text-xs text-ink-muted truncate">存於本機・可隨時回看</span>
              </div>
            </div>
          </div>
          <ArrowRight size={16} className="text-ink-muted transition-transform group-hover:translate-x-1" />
        </button>

        <button
          onClick={onOpenBackup}
          type="button"
          className="flex min-h-[44px] items-center gap-2.5 rounded-xl bg-paper-sunken px-3.5 py-2.5 text-left text-xs text-ink-secondary border border-border-base/50 cursor-pointer hover:text-ink transition-colors"
        >
          <ShieldCheck size={16} className="text-accent shrink-0" />
          <span className="flex-1 leading-relaxed">
            內容只保存在這台裝置；使用 AI 時，當次文字才會經安全連線處理。
          </span>
        </button>
      </nav>

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
