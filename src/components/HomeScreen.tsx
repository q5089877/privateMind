import React, { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowRight, Check, History, Loader2, MessageSquare, ShieldCheck, Waves } from 'lucide-react';
import { UI_TEXT } from '../config/textConfig';
import { triggerHaptic } from '../utils/haptics';
import { CRISIS_RESOURCES, evaluateSafetyRisk, SafetyEvaluation } from '../services/ai/roles/safetyRoute';
import type { Moment } from '../types';

interface Props {
  onStartInput: (text: string) => Promise<void>;
  onReview: () => void;
  onOpenChat?: () => void;
}

export const HomeScreen: React.FC<Props> = ({ onStartInput, onReview, onOpenChat }) => {
  const [input, setInput] = useState('');

  const [safetyCheck, setSafetyCheck] = useState<SafetyEvaluation | null>(null);
  const [showCrisisHelp, setShowCrisisHelp] = useState(false);
  const [submittingState, setSubmittingState] = useState<'idle' | 'submitting' | 'settled'>('idle');

  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const beginConversation = async () => {
    const text = input.trim();
    if (!text || submittingState !== 'idle') return;

    // 前置生命安全檢測 (依據指引，安全優先於所有零問號憲法)
    const safetyEval = evaluateSafetyRisk(text);
    if (safetyEval.decision === 'imminent_risk') {
      // 依舊落盤，確保不漏掉求助者的真實紀錄
      await onStartInput(text);
      setInput('');
      setSubmittingState('idle');
      setSafetyCheck(safetyEval);
      setShowCrisisHelp(false);
      return;
    }

    triggerHaptic('docking');
    setSubmittingState('submitting');
    window.setTimeout(() => {
      setSubmittingState('settled');
      window.setTimeout(async () => {
        await onStartInput(text);
        onOpenChat?.();
        setInput('');
        setSubmittingState('idle');
      }, 450);
    }, 550);
  };

  const trimmedLength = input.trim().length;

  return (
    <div className="w-full max-w-[580px] min-h-[calc(100vh-90px)] px-1 py-1 sm:py-7 flex flex-col space-y-3 sm:space-y-6">

      <header className="flex items-center justify-between gap-3 pt-0.5 sm:pt-1">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-white">
            <Waves size={20} strokeWidth={1.8} />
          </div>
          <div className="flex flex-col">
            <span className="text-[17px] font-semibold tracking-[-0.03em] text-ink leading-tight">{UI_TEXT.home.brandTitle}</span>
            <span className="text-[9px] tracking-[0.18em] text-ink-muted uppercase">{UI_TEXT.home.brandSubtitle}</span>
          </div>
        </div>
      </header>


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


        <div className="relative py-0.5 sm:py-1">
          <textarea
            ref={inputRef}
            rows={3}
            value={input}
            onChange={e => {
              setInput(e.target.value);
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
          <p className="text-xs text-ink-muted">{UI_TEXT.home.inputHintDefault}</p>

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

      </nav>
    </div>
  );
};
