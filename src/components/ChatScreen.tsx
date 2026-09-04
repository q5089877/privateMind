import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowUp, Compass, MessageCircle, Waves } from 'lucide-react';
import { ConversationTurn, ExploreGroup, ExploreResult, HarborSession, Moment } from '../types';
import { normalizeCompanionResponse } from '../logic/geminiProxyClient';

interface Props {
  moment: Moment | null;
  session: HarborSession | null;
  onLeave: () => void;
  onContinue: (content: string) => Promise<void>;
  getPresentReply: (moment: Moment) => Promise<string | null>;
  getExploration: (session: HarborSession, requestedGroup?: ExploreGroup) => Promise<ExploreResult | null>;
  onSaveReply: (momentId: string, reply: string) => Promise<void>;
  onBeginLanding: (session: HarborSession) => Promise<void>;
}

const legacyFallbackReply = '這一刻先留在這裡。想接著說，或先停在這裡都可以。';

const groupCopy: Record<ExploreGroup, { label: string; detail: string }> = {
  feeling: { label: '從感受慢慢看', detail: '先從此刻的感受與情境，找四個不同入口。' },
  decision: { label: '從選擇與代價切入', detail: '先把想守住的事、現實限制與時間放在一起看。' },
  relationship: { label: '從這段互動看', detail: '只看原話裡已經說出的互動，不替任何人補上動機。' }
};

/** The CHAT scene: one visible conversation, with no historic data pulled in. */
export const ChatScreen: React.FC<Props> = ({ moment, session, onLeave, onContinue, getPresentReply, getExploration, onSaveReply, onBeginLanding }) => {
  const [reply, setReply] = useState('');
  const [replyUnavailable, setReplyUnavailable] = useState(false);
  const [replyAttempt, setReplyAttempt] = useState(0);
  const [continuation, setContinuation] = useState('');
  const [continuationGuide, setContinuationGuide] = useState('');
  const [showComposer, setShowComposer] = useState(false);
  const [showAngles, setShowAngles] = useState(false);
  const [showGroupPicker, setShowGroupPicker] = useState(false);
  const [exploring, setExploring] = useState(false);
  const [exploration, setExploration] = useState<ExploreResult | null>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setReply(moment?.immediateReply && normalizeCompanionResponse(moment.immediateReply) !== legacyFallbackReply ? normalizeCompanionResponse(moment.immediateReply) : '');
    setReplyUnavailable(false);
    setReplyAttempt(0);
    setContinuation('');
    setContinuationGuide('');
    setShowComposer(false);
    setShowAngles(false);
    setShowGroupPicker(false);
    setExploring(false);
    setExploration(null);
  }, [moment?.id]);

  useEffect(() => {
    if (!moment || (moment.immediateReply && normalizeCompanionResponse(moment.immediateReply) !== legacyFallbackReply)) return;
    let alive = true;
    void getPresentReply(moment).then(async value => {
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
  }, [moment?.id, replyAttempt, getPresentReply, onSaveReply]);

  if (!moment || !session) return null;

  const turns: ConversationTurn[] = [...session.turns];
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

  const requestAngles = async (requestedGroup?: ExploreGroup) => {
    if (!requestedGroup && showAngles) {
      setShowAngles(false);
      return;
    }
    setShowAngles(true);
    setShowGroupPicker(false);
    setExploring(true);
    setExploration(await getExploration(session, requestedGroup));
    setExploring(false);
  };

  const activeGroup = exploration?.route.group;
  const otherGroups = activeGroup
    ? (Object.keys(groupCopy) as ExploreGroup[]).filter(group => group !== activeGroup)
    : [];

  return <div className="w-full max-w-[560px] min-h-[calc(100vh-104px)] py-5 sm:py-8">
    <header className="flex min-h-11 items-center">
      <button onClick={onLeave} className="inline-flex items-center gap-1.5 text-sm text-ink-secondary hover:text-ink"><ArrowLeft size={16}/>現在</button>
    </header>

    <main className="pt-8 sm:pt-12">
      <div className="flex items-center gap-2 text-sm font-medium text-accent">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/10"><Waves size={16}/></span>正在談這件事
      </div>
      <h1 className="mt-5 text-[30px] font-medium tracking-[-0.045em] text-ink sm:text-[36px]">我們先從這裡看。</h1>
      <p className="mt-3 text-[15px] leading-relaxed text-ink-secondary">不用一次想完；先把眼前卡住的地方說清一點。</p>

      {session.closure && <aside className="mt-6 rounded-2xl border border-accent/15 bg-surface-subtle px-4 py-3">
        <p className="text-xs font-medium text-accent">上次先停在這裡</p>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-secondary">{session.closure.resumeAnchor || session.closure.unresolved}</p>
      </aside>}

      <section aria-label="這次停靠的對話" className="mt-10 space-y-5">
        {turns.map(turn => turn.role === 'user'
          ? <article key={turn.id} className="ml-5 rounded-[24px] border border-border-base bg-surface px-5 py-4 shadow-[0_3px_10px_rgba(47,70,54,0.06)] sm:ml-12">
              <p className="text-xs font-medium text-ink-muted">你剛才說</p>
              <p className="mt-2 whitespace-pre-wrap text-[18px] leading-[1.7] tracking-[-0.02em] text-ink">{turn.content}</p>
            </article>
          : <article key={turn.id} className="mr-5 border-l-2 border-accent/55 py-1 pl-4 sm:mr-12 sm:pl-5">
              <p className="flex items-center gap-1.5 text-xs font-medium text-accent"><Waves size={14}/>我注意到</p>
              <p className="mt-2 whitespace-pre-wrap text-[16px] leading-[1.85] text-ink-secondary">{turn.content}</p>
            </article>
        )}
        {!hasCurrentAssistant && !reply && !replyUnavailable && <article className="mr-5 border-l-2 border-accent/25 py-1 pl-4 sm:mr-12 sm:pl-5"><p className="text-sm text-ink-muted">正在從這句話裡找一個可以一起看的地方…</p></article>}
        {replyUnavailable && <article className="mr-5 border-l-2 border-border-base py-1 pl-4">
          <p className="text-sm leading-relaxed text-ink-secondary">回應暫時沒有連上，但這段話已保存。</p>
          <button onClick={() => setReplyAttempt(value => value + 1)} className="mt-2 text-sm font-medium text-accent hover:text-ink">再試一次</button>
        </article>}
      </section>

      <section className="mt-10 border-t border-border-base pt-6">
        {showComposer ? <div className="rounded-[24px] border border-accent/20 bg-surface p-4 shadow-[0_5px_16px_rgba(47,70,54,0.07)]">
          <label htmlFor="continue-thought" className="text-sm font-medium text-ink">還想說一點什麼？</label>
          {continuationGuide && <div className="mt-3 rounded-2xl bg-surface-subtle px-3 py-2.5">
            <p className="text-[11px] font-medium text-accent">換個角度</p>
            <p className="mt-1 text-sm leading-relaxed text-ink-secondary">{continuationGuide}</p>
          </div>}
          <textarea ref={composerRef} id="continue-thought" value={continuation} onChange={event => setContinuation(event.target.value)} onKeyDown={event => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              void continueConversation();
            }
          }} placeholder={continuationGuide ? '用自己的話，從這裡接著說……' : '把剛才還沒說完的，接下來……'} rows={3} className="mt-3 w-full resize-none bg-transparent text-[16px] leading-relaxed text-ink outline-none placeholder:text-ink-muted"/>
          <div className="mt-3 flex items-center justify-between border-t border-border-base pt-3">
            <button onClick={() => { setShowComposer(false); setContinuation(''); setContinuationGuide(''); }} className="text-sm text-ink-muted hover:text-ink">先不說了</button>
            <button onClick={() => void continueConversation()} disabled={!continuation.trim()} className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-accent px-4 text-sm font-medium text-white disabled:opacity-35">說下去 <ArrowUp size={15}/></button>
          </div>
        </div> : <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <button onClick={() => openComposer()} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-accent px-5 text-sm font-medium text-white shadow-sm"><MessageCircle size={16}/>接著說</button>
          <button onClick={() => void requestAngles()} className="inline-flex min-h-11 items-center gap-1.5 px-2 text-sm font-medium text-ink-secondary hover:text-ink"><Compass size={16}/>{showAngles ? '收起角度' : '換個角度'}</button>
          <button onClick={() => void onBeginLanding(session)} className="inline-flex min-h-11 items-center px-2 text-sm text-ink-muted hover:text-ink">今天先到這裡</button>
        </div>}

        {showAngles && !showComposer && <div className="mt-5 rounded-[24px] border border-border-base bg-surface-subtle p-4">
          {exploring ? <p className="text-sm text-ink-muted">正在找這次適合的四個切入點…</p> : exploration ? <>
            <p className="text-xs font-medium text-accent">{groupCopy[exploration.route.group].label}</p>
            <p className="mt-1 text-sm leading-relaxed text-ink-secondary">{groupCopy[exploration.route.group].detail} 它們是角度，不是結論。</p>
            <div className="mt-3">
              <button onClick={() => setShowGroupPicker(value => !value)} className="text-sm font-medium text-ink-secondary underline decoration-border-strong underline-offset-4 hover:text-ink">換一種方式看</button>
              {showGroupPicker && <div className="mt-3 flex flex-wrap gap-2">
                {otherGroups.map(group => <button key={group} onClick={() => void requestAngles(group)} className="rounded-full border border-border-base bg-surface px-3 py-2 text-sm text-ink-secondary hover:border-accent/40 hover:text-ink">{groupCopy[group].label}</button>)}
              </div>}
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {exploration.perspectives.map(perspective => <button key={perspective.id} onClick={() => openComposer(perspective.followUp)} className="rounded-2xl border border-border-base bg-surface px-4 py-4 text-left transition-colors hover:border-accent/50">
                <span className="text-[15px] font-medium text-ink">{perspective.title}</span>
                <span className="mt-2 block text-sm leading-[1.75] text-ink-secondary">{perspective.content}</span>
                <span className="mt-3 block border-t border-border-base pt-2.5 text-xs leading-relaxed text-accent">想接著談：{perspective.followUp}</span>
                <span className="mt-2 block text-[11px] leading-relaxed text-ink-muted">根據：「{perspective.sourcePhrases.join('／')}」</span>
              </button>)}
            </div>
          </> : <p className="text-sm leading-relaxed text-ink-secondary">這次沒有可靠的新角度；你也可以直接接著說。</p>}
        </div>}
      </section>
    </main>
  </div>;
};
