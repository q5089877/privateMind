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

  useEffect(() => {
    if (!moment || (moment.immediateReply && !isFallbackReply(moment.immediateReply))) return;
    let alive = true;
    void getPresentReply(moment, session).then(async value => {
      if (!alive) return;
      if (!value) {
        setReplyUnavailable(true);
        return;
      }
      const clean = normalizeCompanionResponse(value);
      setReply(clean);
      await onSaveReply(moment.id, clean);
    });
    return () => { alive = false; };
  }, [moment?.id, getPresentReply, onSaveReply, session]);

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

  return <div className="w-full max-w-[560px] min-h-[calc(100vh-104px)] py-5 sm:py-8">
    <header className="flex min-h-11 items-center">
      <button onClick={onLeave} className="inline-flex items-center gap-1.5 text-sm text-ink-secondary hover:text-ink"><ArrowLeft size={16}/>{t.backBtn}</button>
    </header>

    <main className="pt-8 sm:pt-12">
      <div className="flex items-center gap-2 text-sm font-medium text-accent">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/10"><Waves size={16}/></span>{t.sceneTag}
      </div>
      <h1 className="mt-5 text-[30px] font-medium tracking-[-0.045em] text-ink sm:text-[36px]">{t.heroTitle}</h1>
      <p className="mt-3 text-[15px] leading-relaxed text-ink-secondary">{t.heroSubtitle}</p>

      {session.closure && <aside className="mt-6 rounded-2xl border border-accent/15 bg-surface-subtle px-4 py-3">
        <p className="text-xs font-medium text-accent">{t.pastAnchorHeader}</p>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-secondary">{session.closure.resumeAnchor || session.closure.unresolved}</p>
      </aside>}

      <section aria-label="這次停靠的對話" className="mt-10 space-y-5">
        {turns.map((turn, index) => {
          const isLastAssistant = turn.role === 'assistant' && index === turns.length - 1;
          return turn.role === 'user'
            ? <article key={turn.id} className="ml-5 rounded-[24px] border border-border-base bg-surface px-5 py-4 shadow-[0_3px_10px_rgba(47,70,54,0.06)] sm:ml-12">
                <p className="text-xs font-medium text-ink-muted">{t.userTurnLabel}</p>
                <p className="mt-2 whitespace-pre-wrap text-[18px] leading-[1.7] tracking-[-0.02em] text-ink">{turn.content}</p>
              </article>
            : <article key={turn.id} className="mr-5 border-l-2 border-accent/55 py-1 pl-4 sm:mr-12 sm:pl-5">
                <p className="flex items-center gap-1.5 text-xs font-medium text-accent"><Waves size={14}/>{t.aiMirrorLabel}</p>
                <p className="mt-2 whitespace-pre-wrap text-[16px] leading-[1.85] text-ink-secondary">{turn.content}</p>

                {isLastAssistant && (
                  <div className="mt-3">
                    {!showAngles ? (
                      <button
                        type="button"
                        disabled={exploring}
                        onClick={() => void requestAngles()}
                        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs text-ink-muted transition-colors hover:bg-surface-subtle hover:text-accent disabled:opacity-50"
                      >
                        <RotateCw size={12} className={exploring ? 'animate-spin' : ''} />
                        <span>{exploring ? t.exploreLoading : t.exploreBtn}</span>
                      </button>
                    ) : (
                      <div className="rounded-2xl border border-accent/20 bg-surface-subtle p-3.5 sm:p-4">
                        {exploring ? (
                          <p className="flex items-center gap-2 text-xs text-ink-muted">
                            <RotateCw size={13} className="animate-spin text-accent" />
                            {t.exploreLoading}
                          </p>
                        ) : exploration && exploration.perspectives.length > 0 ? (() => {
                          const currentPerspective = exploration.perspectives[activePerspectiveIndex % exploration.perspectives.length];
                          return (
                            <div>
                              <div className="flex items-center justify-between text-[11px] font-medium text-accent">
                                <span>{t.explorePerspectivePrefix} · {currentPerspective.title}</span>
                                <button
                                  type="button"
                                  onClick={() => setShowAngles(false)}
                                  className="text-ink-muted hover:text-ink transition-colors"
                                >
                                  {t.closeExploreBtn}
                                </button>
                              </div>
                              <p className="mt-2 text-[15px] leading-relaxed text-ink">{currentPerspective.content}</p>
                              <div className="mt-3 flex items-center justify-between border-t border-border-base/50 pt-2.5 text-xs">
                                <button
                                  type="button"
                                  disabled={exploring}
                                  onClick={() => void nextPerspective()}
                                  className="inline-flex items-center gap-1.5 font-medium text-accent hover:text-ink transition-colors disabled:opacity-50"
                                >
                                  <RotateCw size={12} className={exploring ? 'animate-spin' : ''} />
                                  <span>{exploring ? t.exploreLoading : t.exploreNextBtn}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openComposer(currentPerspective.followUp)}
                                  className="inline-flex items-center gap-1 font-medium text-ink-secondary hover:text-accent transition-colors"
                                >
                                  <span>{t.exploreAdoptBtn}</span>
                                  <ArrowDown size={12} />
                                </button>
                              </div>
                            </div>
                          );
                        })() : (
                          <p className="text-xs text-ink-muted">{t.exploreEmpty}</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </article>;
        })}
        {!hasCurrentAssistant && !reply && !replyUnavailable && !isRetrying && (
          <article className="mr-5 border-l-2 border-accent/25 py-1 pl-4 sm:mr-12 sm:pl-5">
            <p className="flex items-center gap-2 text-sm text-ink-muted">
              <RotateCw size={14} className="animate-spin text-accent/70" />
              {t.loadingHint}
            </p>
          </article>
        )}
        {(replyUnavailable || isRetrying) && (
          <article className="mr-5 border-l-2 border-border-base py-1 pl-4 sm:mr-12 sm:pl-5">
            <p className="text-sm leading-relaxed text-ink-secondary">{t.errorHint}</p>
            <button
              type="button"
              disabled={isRetrying}
              onClick={() => void handleRetry()}
              className="mt-2.5 inline-flex min-h-[38px] items-center gap-2 rounded-full border border-border-base bg-surface px-4 py-1.5 text-xs font-medium text-ink-secondary shadow-xs transition-all hover:border-accent/40 hover:text-ink active:scale-98 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RotateCw size={13} className={isRetrying ? 'animate-spin text-accent' : ''} />
              <span>{isRetrying ? '連線重試中……' : t.retryBtn}</span>
            </button>
          </article>
        )}
      </section>

      <section className="mt-10 border-t border-border-base pt-6">
        {showComposer ? <div className="rounded-[24px] border border-accent/20 bg-surface p-4 shadow-[0_5px_16px_rgba(47,70,54,0.07)]">
          <label htmlFor="continue-thought" className="text-sm font-medium text-ink">{t.composerTitle}</label>
          {continuationGuide && <div className="mt-3 rounded-2xl bg-surface-subtle px-3 py-2.5">
            <p className="text-[11px] font-medium text-accent">{t.explorePerspectivePrefix}</p>
            <p className="mt-1 text-sm leading-relaxed text-ink-secondary">{continuationGuide}</p>
          </div>}
          <textarea ref={composerRef} id="continue-thought" value={continuation} onChange={event => setContinuation(event.target.value)} onKeyDown={event => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              void continueConversation();
            }
          }} placeholder={continuationGuide ? t.composerPlaceholderGuide : t.composerPlaceholderDefault} rows={3} className="mt-3 w-full resize-none bg-transparent text-[16px] leading-relaxed text-ink outline-none placeholder:text-ink-muted"/>
          <div className="mt-3 flex items-center justify-between border-t border-border-base pt-3">
            <button onClick={() => { setShowComposer(false); setContinuation(''); setContinuationGuide(''); }} className="text-sm text-ink-muted hover:text-ink">{t.composerCancelBtn}</button>
            <button onClick={() => void continueConversation()} disabled={!continuation.trim()} className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-accent px-4 text-sm font-medium text-white disabled:opacity-35">{t.composerSubmitBtn} <ArrowDown size={15}/></button>
          </div>
        </div> : <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          <button type="button" onClick={() => openComposer()} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-accent px-5 text-sm font-medium text-white shadow-sm transition-transform hover:-translate-y-px active:translate-y-px">
            <MessageCircle size={16}/>{t.continueBtn}
          </button>
          <button type="button" onClick={() => void onBeginLanding(session)} className="inline-flex min-h-11 items-center rounded-full border border-border-base bg-surface px-4 text-sm font-medium text-ink-secondary shadow-xs transition-colors hover:border-accent/40 hover:text-ink">
            {t.concludeBtn}
          </button>
        </div>}
      </section>
    </main>
  </div>;
};
