import React, { useEffect, useRef, useState } from 'react';
import { ArrowUp, CircleDashed, Compass, Focus, MessageCircle, ShieldCheck, Split, Waves } from 'lucide-react';
import { BackupStatus, ConversationTurn, HarborSession, Moment } from '../types';
import { normalizeCompanionResponse } from '../logic/geminiProxyClient';

interface Props {
  moment: Moment | null;
  session: HarborSession | null;
  onReset: () => void;
  onContinue: (content: string) => Promise<void>;
  getPresentReply: (moment: Moment) => Promise<string | null>;
  onSaveReply: (momentId: string, reply: string) => Promise<void>;
  getBackupStatus: () => Promise<BackupStatus>;
  onOpenBackup: () => void;
}

const angles = [
  { id: 'focus', label: '聚焦一幕', text: '最先浮出來的一段是……', icon: Focus },
  { id: 'words', label: '換個說法', text: '如果換成更貼近的字，我想說的是……', icon: MessageCircle },
  { id: 'separate', label: '分開看', text: '把混在一起的部分分開，眼前最在意的是……', icon: Split },
  { id: 'exception', label: '找個例外', text: '也有不一樣的時候，例如……', icon: CircleDashed }
];

const legacyFallbackReply = '這一刻先留在這裡。想接著說，或先停在這裡都可以。';

const backupLabel = (status: BackupStatus) => status.lastExportedAt
  ? `已建立備份 · ${new Intl.DateTimeFormat('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(status.lastExportedAt))}`
  : '已留在這台裝置';

/** First UI step: a HarborSession is visibly a conversation, not a completed card. */
export const CompletionScreen: React.FC<Props> = ({ moment, session, onReset, onContinue, getPresentReply, onSaveReply, getBackupStatus, onOpenBackup }) => {
  const [reply, setReply] = useState('');
  const [continuing, setContinuing] = useState(false);
  const [continuation, setContinuation] = useState('');
  const [showAngles, setShowAngles] = useState(false);
  const [backup, setBackup] = useState<BackupStatus | null>(null);
  const [replyUnavailable, setReplyUnavailable] = useState(false);
  const [replyAttempt, setReplyAttempt] = useState(0);
  const continuationRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { void getBackupStatus().then(setBackup); }, [getBackupStatus]);

  useEffect(() => {
    setContinuing(false);
    setContinuation('');
    setShowAngles(false);
    setReplyUnavailable(false);
    setReplyAttempt(0);
    setReply(moment?.immediateReply && normalizeCompanionResponse(moment.immediateReply) !== legacyFallbackReply ? normalizeCompanionResponse(moment.immediateReply) : '');
  }, [moment?.id]);

  useEffect(() => {
    if (!moment) return;
    if (moment.immediateReply && normalizeCompanionResponse(moment.immediateReply) !== legacyFallbackReply) {
      setReply(normalizeCompanionResponse(moment.immediateReply));
      return;
    }
    let alive = true;
    setReply('');
    setReplyUnavailable(false);
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

  if (!moment) return null;

  const turns: ConversationTurn[] = session?.turns?.length
    ? [...session.turns]
    : [{ id: `visible-${moment.id}`, role: 'user', content: moment.content, createdAt: moment.createdAt, momentId: moment.id }];
  const hasCurrentAssistant = turns.some(turn => turn.role === 'assistant' && turn.momentId === moment.id);
  if (reply && !hasCurrentAssistant) turns.push({ id: `visible-reply-${moment.id}`, role: 'assistant', content: reply, createdAt: Date.now(), momentId: moment.id });

  const openContinuation = (initial = '') => {
    setContinuation(initial);
    setContinuing(true);
    window.setTimeout(() => continuationRef.current?.focus(), 0);
  };

  const saveContinuation = async () => {
    const text = continuation.trim();
    if (!text) return;
    await onContinue(text);
  };

  return <div className="w-full max-w-[560px] min-h-[calc(100vh-104px)] flex flex-col py-4">
    <div className="flex-1 pt-8 sm:pt-14">
      <div className="flex items-center gap-2 text-accent"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/10"><Waves size={16} strokeWidth={1.8}/></span><span className="text-sm font-medium">正在停靠</span></div>
      <h1 className="mt-5 text-[30px] sm:text-[36px] font-medium tracking-[-0.045em] text-ink">我們先在這裡說說。</h1>
      <p className="mt-3 max-w-md text-[15px] leading-relaxed text-ink-secondary">不用一次想清楚。這件事可以慢慢談開。</p>

      <section aria-label="這次停靠的對話" className="mt-10 space-y-5 sm:mt-12">
        {turns.map(turn => turn.role === 'user'
          ? <article key={turn.id} className="ml-7 rounded-[24px] border border-border-base bg-surface px-5 py-4 shadow-[0_3px_10px_rgba(47,70,54,0.06)] sm:ml-12"><p className="text-xs font-medium text-ink-muted">你剛才說</p><p className="mt-2 text-[18px] leading-[1.7] tracking-[-0.02em] text-ink whitespace-pre-wrap">{turn.content}</p></article>
          : <article key={turn.id} className="mr-6 border-l-2 border-accent/55 py-1 pl-4 sm:mr-12 sm:pl-5"><p className="flex items-center gap-1.5 text-xs font-medium text-accent"><Waves size={14} strokeWidth={1.6}/>一起看看</p><p className="mt-2 text-[16px] leading-[1.85] text-ink-secondary whitespace-pre-wrap">{turn.content}</p></article>
        )}
        {!hasCurrentAssistant && !reply && !replyUnavailable && <article className="mr-6 border-l-2 border-accent/25 py-1 pl-4 sm:mr-12 sm:pl-5"><p className="flex items-center gap-1.5 text-xs font-medium text-accent"><Waves size={14} strokeWidth={1.6}/>一起看看</p><p className="mt-2 text-sm text-ink-muted">正在想想怎麼陪你看這一句…</p></article>}
        {replyUnavailable && <article className="mr-6 border-l-2 border-border-base py-1 pl-4 sm:mr-12 sm:pl-5"><p className="text-sm leading-relaxed text-ink-secondary">回應暫時沒有連上。</p><button onClick={() => setReplyAttempt(value => value + 1)} className="mt-2 text-sm font-medium text-accent hover:text-ink">再試一次</button></article>}
      </section>

      <section className="mt-9 border-t border-border-base pt-6 sm:mt-11">
        {continuing ? <div className="rounded-[24px] border border-accent/20 bg-surface p-4 shadow-[0_5px_16px_rgba(47,70,54,0.07)]"><label htmlFor="continue-thought" className="text-sm font-medium text-ink">還想說一點什麼？</label><textarea ref={continuationRef} id="continue-thought" value={continuation} onChange={event => setContinuation(event.target.value)} onKeyDown={event=>{if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void saveContinuation(); }}} placeholder="把剛才還沒說完的，接下來……" rows={3} className="mt-3 w-full resize-none bg-transparent text-[16px] leading-relaxed text-ink outline-none placeholder:text-ink-muted"/><div className="mt-3 flex items-center justify-between border-t border-border-base pt-3"><button onClick={()=>{setContinuing(false);setContinuation('');}} className="text-sm text-ink-muted hover:text-ink">先不說了</button><button onClick={()=>void saveContinuation()} disabled={!continuation.trim()} className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-accent px-4 text-sm font-medium text-white disabled:opacity-35">說下去 <ArrowUp size={15}/></button></div></div> : <div className="flex flex-wrap items-center gap-x-4 gap-y-2"><button onClick={() => openContinuation()} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-accent px-5 text-sm font-medium text-white shadow-sm transition-transform active:scale-[0.98]"><MessageCircle size={16}/>接著說</button><button onClick={() => setShowAngles(value => !value)} className="inline-flex min-h-11 items-center gap-1.5 px-2 text-sm font-medium text-ink-secondary hover:text-ink"><Compass size={16}/>換個角度</button><button onClick={onReset} className="inline-flex min-h-11 items-center px-2 text-sm text-ink-muted hover:text-ink">今天先到這裡</button></div>}

        {showAngles && !continuing && <div className="mt-5 rounded-[24px] border border-border-base bg-surface-subtle p-4"><p className="text-sm text-ink-secondary">選一個入口就好，不必全部回答。</p><div className="mt-3 grid grid-cols-2 gap-2">{angles.map(angle => { const Icon = angle.icon; return <button key={angle.id} onClick={() => openContinuation(angle.text)} className="rounded-2xl border border-border-base bg-surface px-3 py-3 text-left transition-colors hover:border-accent/40"><span className="flex items-center gap-1.5 text-sm font-medium text-ink"><Icon size={15} className="text-accent"/>{angle.label}</span><span className="mt-2 block text-xs leading-relaxed text-ink-muted">{angle.text}</span></button>; })}</div></div>}
      </section>

      <button onClick={onOpenBackup} className="mt-10 inline-flex min-h-10 items-center gap-2 text-xs text-ink-muted hover:text-ink"><ShieldCheck size={15} className="text-accent"/>{backup ? backupLabel(backup) : '正在確認保存狀態…'}</button>
    </div>
  </div>;
};
