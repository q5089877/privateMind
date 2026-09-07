import React, { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowLeft, MessageCircle, RotateCw, Waves } from 'lucide-react';
import { ConversationTurn, ExploreGroup, ExploreResult, HarborSession, Moment } from '../types';
import { normalizeCompanionResponse } from '../logic/geminiProxyClient';
import { UI_TEXT } from '../config/textConfig';

interface Props {
  moment: Moment | null;
  session: HarborSession | null;
  onLeave: () => void;
  onContinue: (content: string) => Promise<void>;
  getPresentReply: (moment: Moment, session?: HarborSession | null, force?: boolean) => Promise<string | null>;
  getExploration: (session: HarborSession, requestedGroupOrExcludeAxes?: ExploreGroup | string[]) => Promise<ExploreResult | null>;
  onSaveReply: (momentId: string, reply: string) => Promise<void>;
  onBeginLanding: (session: HarborSession) => Promise<void>;
}

const legacyFallbackReply = '這一刻先留在這裡。想接著說，或先停在這裡都可以。';

const isFallbackReply = (text?: string | null) => {
  if (!text) return false;
  const clean = normalizeCompanionResponse(text);
  return clean === legacyFallbackReply ||
    clean === 'AI暫時無回應' ||
    clean.includes('已經留下來。眼前最卡住、最想先分清的是哪一部分');
};

/** The CHAT scene: one visible conversation, with no historic data pulled in. */
export const ChatScreen: React.FC<Props> = ({ moment, session, onLeave, onContinue, getPresentReply, getExploration, onSaveReply, onBeginLanding }) => {
  const [reply, setReply] = useState('');
  const [replyUnavailable, setReplyUnavailable] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [continuation, setContinuation] = useState('');
  const [continuationGuide, setContinuationGuide] = useState('');
  const [showComposer, setShowComposer] = useState(false);
  const [showAngles, setShowAngles] = useState(false);
  const [exploring, setExploring] = useState(false);
  const [exploration, setExploration] = useState<ExploreResult | null>(null);
  const [activePerspectiveIndex, setActivePerspectiveIndex] = useState(0);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const hasValidReply = moment?.immediateReply && !isFallbackReply(moment.immediateReply);
    setReply(hasValidReply ? normalizeCompanionResponse(moment!.immediateReply!) : '');
    setReplyUnavailable(Boolean(moment?.immediateReply && isFallbackReply(moment.immediateReply)));
    setIsRetrying(false);
    setContinuation('');
    setContinuationGuide('');
    setShowComposer(false);
    setShowAngles(false);
    setExploring(false);
    setExploration(null);
    setActivePerspectiveIndex(0);
  }, [moment?.id]);

  // 新訊息或狀態變更時自動平滑滾動到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [reply, exploring, showAngles, showComposer]);


  const handleRetry = async () => {
    if (!moment || isRetrying) return;
    setIsRetrying(true);
    setReplyUnavailable(false);
    try {
      const value = await getPresentReply(moment, session, true);
      if (value) {
        const clean = normalizeCompanionResponse(value);
        setReply(clean);
        await onSaveReply(moment.id, clean);
        setReplyUnavailable(false);
      } else {
        setReplyUnavailable(true);
      }
    } catch {
      setReplyUnavailable(true);
    } finally {
      setIsRetrying(false);
    }
  };

  if (!moment || !session) return null;

  const t = UI_TEXT.chat;
  const turns: ConversationTurn[] = [...session.turns].filter(turn => turn.role !== 'assistant' || !isFallbackReply(turn.content));
  const hasCurrentAssistant = turns.some(turn => turn.role === 'assistant' && turn.momentId === moment.id);
  if (reply && !hasCurrentAssistant) turns.push({ id: `visible-reply-${moment.id}`, role: 'assistant', content: reply, createdAt: Date.now(), momentId: moment.id });

  const isMultiTurn = turns.length >= 2;

  const openComposer = (guide = '') => {
    setContinuation('');
    setContinuationGuide(guide);
    setShowComposer(true);
    window.setTimeout(() => composerRef.current?.focus(), 0);
  };

  const continueConversation = async () => {
    const content = continuation.trim();
    if (content) await onContinue(content);
  };

  const requestAngles = async () => {
    if (showAngles) {
      setShowAngles(false);
      return;
    }
    setShowAngles(true);
    setExploring(true);
    const result = await getExploration(session);
    setExploration(result);
    setActivePerspectiveIndex(0);
    setExploring(false);
  };

  const nextPerspective = async () => {
    if (!exploration || exploration.perspectives.length === 0 || exploring) return;
    const nextIdx = activePerspectiveIndex + 1;
    if (nextIdx >= exploration.perspectives.length) {
      setExploring(true);
      const seenIds = exploration.perspectives.map(p => p.id);
      const nextBatch = await getExploration(session, seenIds);
      if (nextBatch && nextBatch.perspectives.length > 0) {
        const filtered = nextBatch.perspectives.filter(p => !seenIds.includes(p.id));
        if (filtered.length > 0) {
          setExploration(prev => prev ? {
            ...prev,
            perspectives: [...prev.perspectives, ...filtered]
          } : nextBatch);
          setActivePerspectiveIndex(nextIdx);
        } else {
          setActivePerspectiveIndex(0);
        }
      } else {
        setActivePerspectiveIndex(0);
      }
      setExploring(false);
    } else {
      setActivePerspectiveIndex(nextIdx);
    }
  };

  return <div className="w-full max-w-[560px] min-h-[calc(100vh-90px)] pb-12 pt-2 sm:pt-4">
    <header className="flex min-h-[44px] items-center justify-between">
      <button onClick={onLeave} className="inline-flex min-h-[44px] items-center gap-1.5 px-1 text-sm font-medium text-ink-secondary hover:text-ink cursor-pointer">
        <ArrowLeft size={16}/>{t.backBtn}
      </button>
      {isMultiTurn && (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
          <Waves size={12}/>{t.sceneTag}
        </span>
      )}
    </header>

    <main className="pt-3 sm:pt-5">
      {!isMultiTurn && (
        <div className="mb-8">
          <div className="flex items-center gap-2 text-xs font-semibold tracking-wide uppercase text-accent">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent/10"><Waves size={13}/></span>
            <span>{t.sceneTag}</span>
          </div>
          <h1 className="mt-3 text-[26px] font-medium tracking-[-0.04em] text-ink sm:text-[32px]">{t.heroTitle}</h1>
          <p className="mt-2 text-[15px] leading-relaxed text-ink-secondary">{t.heroSubtitle}</p>
        </div>
      )}

      {session.closure && <aside className="mb-6 rounded-2xl border border-accent/20 bg-surface-subtle px-4 py-3">
        <p className="text-xs font-medium text-accent">{t.pastAnchorHeader}</p>
        <p className="mt-1 text-sm leading-relaxed text-ink-secondary">{session.closure.resumeAnchor || session.closure.unresolved}</p>
      </aside>}

      <section aria-label="這次停靠的對話" className="space-y-6">
        {turns.map((turn, index) => {
          const isLastAssistant = turn.role === 'assistant' && index === turns.length - 1;
          return turn.role === 'user'
            ? <article key={turn.id} className="ml-6 sm:ml-14 rounded-[22px] border border-border-base/80 bg-surface px-5 py-3.5 shadow-xs">
                <p className="whitespace-pre-wrap text-[17px] leading-[1.65] tracking-[-0.015em] text-ink">{turn.content}</p>
              </article>
            : <article key={turn.id} className="mr-3 sm:mr-10 border-l-2 border-accent/50 py-1 pl-4 sm:pl-5">
                <p className="whitespace-pre-wrap text-[16px] leading-[1.85] text-ink-body">{turn.content}</p>

                {isLastAssistant && (
                  <div className="mt-3">
                    {!showAngles ? (
                      <button
                        type="button"
                        disabled={exploring}
                        onClick={() => void requestAngles()}
                        className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-accent/30 bg-accent/5 px-4 py-1.5 text-xs font-medium text-accent transition-all hover:bg-accent/12 active:scale-95 disabled:opacity-50 cursor-pointer shadow-2xs"
                      >
                        <RotateCw size={13} className={exploring ? 'animate-spin' : ''} />
                        <span>{exploring ? t.exploreLoading : t.exploreBtn}</span>
                      </button>
                    ) : (
                      <div className="mt-2 rounded-2xl border border-accent/25 bg-surface-subtle p-4 shadow-xs">
                        {exploring ? (
                          <p className="flex items-center gap-2 text-xs font-medium text-ink-muted min-h-[44px]">
                            <RotateCw size={14} className="animate-spin text-accent" />
                            {t.exploreLoading}
                          </p>
                        ) : exploration && exploration.perspectives.length > 0 ? (() => {
                          const currentPerspective = exploration.perspectives[activePerspectiveIndex % exploration.perspectives.length];
                          return (
                            <div>
                              <div className="flex items-center justify-between text-xs font-medium text-accent">
                                <span>{t.explorePerspectivePrefix} · {currentPerspective.title}</span>
                                <button
                                  type="button"
                                  onClick={() => setShowAngles(false)}
                                  className="inline-flex min-h-[36px] items-center px-2 text-ink-muted hover:text-ink transition-colors cursor-pointer"
                                >
                                  {t.closeExploreBtn}
                                </button>
                              </div>
                              <p className="mt-2 text-[15px] leading-relaxed text-ink">{currentPerspective.content}</p>
                              <div className="mt-3.5 flex items-center justify-between border-t border-border-base/60 pt-2.5 text-xs">
                                <button
                                  type="button"
                                  disabled={exploring}
                                  onClick={() => void nextPerspective()}
                                  className="inline-flex min-h-[44px] items-center gap-1.5 font-medium text-accent hover:text-ink transition-colors disabled:opacity-50 cursor-pointer"
                                >
                                  <RotateCw size={13} className={exploring ? 'animate-spin' : ''} />
                                  <span>{exploring ? t.exploreLoading : t.exploreNextBtn}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openComposer(currentPerspective.followUp)}
                                  className="inline-flex min-h-[44px] items-center gap-1 font-medium text-ink-secondary hover:text-accent transition-colors cursor-pointer"
                                >
                                  <span>{t.exploreAdoptBtn}</span>
                                  <ArrowDown size={13} />
                                </button>
                              </div>
                            </div>
                          );
                        })() : (
                          <p className="text-xs text-ink-muted py-2">{t.exploreEmpty}</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </article>;
        })}
        {(replyUnavailable || isRetrying) && (
          <article className="mr-3 border-l-2 border-border-base py-2 pl-4 sm:mr-10 sm:pl-5">
            <p className="text-sm leading-relaxed text-ink-secondary">{t.errorHint}</p>
            <button
              type="button"
              disabled={isRetrying}
              onClick={() => void handleRetry()}
              className="mt-3 inline-flex min-h-[44px] items-center gap-2 rounded-full border border-border-base bg-surface px-4 py-2 text-xs font-medium text-ink-secondary shadow-xs transition-all hover:border-accent/40 hover:text-ink active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
            >
              <RotateCw size={13} className={isRetrying ? 'animate-spin text-accent' : ''} />
              <span>{isRetrying ? '連線重試中……' : t.retryBtn}</span>
            </button>
          </article>
        )}
        {/* 自動滾動錨點 */}
        <div ref={messagesEndRef} className="h-2" />
      </section>

      <section className="mt-8 border-t border-border-base/70 pt-6">
        {showComposer ? <div className="rounded-[24px] border border-accent/25 bg-surface p-4.5 shadow-[0_5px_18px_rgba(47,70,54,0.08)]">
          <label htmlFor="continue-thought" className="text-sm font-medium text-ink">{t.composerTitle}</label>
          {continuationGuide && <div className="mt-2.5 rounded-2xl bg-surface-subtle px-3.5 py-2.5">
            <p className="text-[11px] font-semibold text-accent">{t.explorePerspectivePrefix}</p>
            <p className="mt-1 text-sm leading-relaxed text-ink-secondary">{continuationGuide}</p>
          </div>}
          <textarea ref={composerRef} id="continue-thought" value={continuation} onChange={event => setContinuation(event.target.value)} onKeyDown={event => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              void continueConversation();
            }
          }} placeholder={continuationGuide ? t.composerPlaceholderGuide : t.composerPlaceholderDefault} rows={3} className="mt-3 w-full resize-none bg-transparent text-[16px] leading-relaxed text-ink outline-none placeholder:text-ink-muted"/>
          <div className="mt-3 flex items-center justify-between border-t border-border-base/60 pt-3">
            <button onClick={() => { setShowComposer(false); setContinuation(''); setContinuationGuide(''); }} className="inline-flex min-h-[44px] items-center px-2 text-sm text-ink-muted hover:text-ink cursor-pointer">{t.composerCancelBtn}</button>
            <button onClick={() => void continueConversation()} disabled={!continuation.trim()} className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-accent px-5 text-sm font-medium text-white disabled:opacity-35 cursor-pointer active:scale-95 shadow-xs">{t.composerSubmitBtn} <ArrowDown size={15}/></button>
          </div>
        </div> : <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => openComposer()} className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-accent px-5 text-sm font-medium text-white shadow-sm transition-transform hover:-translate-y-px active:translate-y-px cursor-pointer">
            <MessageCircle size={16}/>{t.continueBtn}
          </button>
          <button type="button" onClick={() => void onBeginLanding(session)} className="inline-flex min-h-[44px] items-center rounded-full border border-border-base bg-surface px-4.5 text-sm font-medium text-ink-secondary shadow-xs transition-colors hover:border-accent/40 hover:text-ink cursor-pointer active:scale-98">
            {t.concludeBtn}
          </button>
        </div>}
      </section>
    </main>
  </div>;
};
