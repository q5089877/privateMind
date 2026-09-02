import React, { useEffect, useRef, useState } from 'react';
import { ArrowUp, Check, History, MessageCircle, Sparkles } from 'lucide-react';
import { ThoughtThread } from '../types';
import { ThoughtPrompts } from './ThoughtPrompts';
import { GeminiProxyClient, normalizeCompanionResponse } from '../logic/geminiProxyClient';
import { findRelatedMoments } from '../logic/memory';

interface RelatedMemory { id: string; createdAt: number; content: string; }
interface Props { thread: ThoughtThread | null; onReset: () => void; onReview: () => void; onContinue: (threadId: string, content: string) => Promise<void>; getPastThoughts: () => Promise<ThoughtThread[]>; onSaveReflection: (threadId: string, entryId: string, response: string, relatedIds: string[]) => Promise<void>; onDismissRelatedMemory: (threadId: string, entryId: string, sourceId: string) => Promise<void>; }
const formatDate = (time: number) => new Intl.DateTimeFormat('zh-TW', { month: 'numeric', day: 'numeric' }).format(new Date(time));

export const CompletionScreen: React.FC<Props> = ({ thread, onReset, onReview, onContinue, getPastThoughts, onSaveReflection, onDismissRelatedMemory }) => {
  const [response, setResponse] = useState(''); const [related, setRelated] = useState<RelatedMemory[]>([]); const [showPrompts, setShowPrompts] = useState(false); const [continuing, setContinuing] = useState(false); const [continuation, setContinuation] = useState(''); const continuationRef = useRef<HTMLTextAreaElement>(null);
  const latest = thread?.entries[thread.entries.length - 1];
  useEffect(() => {
    if (!thread || !latest) return;
    if (latest.aiResponse) {
      const clean = normalizeCompanionResponse(latest.aiResponse); setResponse(clean);
      if (clean !== latest.aiResponse) void onSaveReflection(thread.id, latest.id, clean, latest.relatedEntryIds || []);
      if (latest.relatedEntryIds?.length) void getPastThoughts().then(all => { const source = new Map(all.flatMap(item => item.entries).map(entry => [entry.id, entry])); setRelated(latest.relatedEntryIds!.map(id => source.get(id)).filter((entry): entry is NonNullable<typeof entry> => Boolean(entry)).map(entry => ({ id: entry.id, createdAt: entry.createdAt, content: entry.content }))); });
      return;
    }
    let alive = true;
    void getPastThoughts().then(async all => {
      const matches = findRelatedMoments(latest.content, all, latest.id, latest.dismissedRelatedEntryIds);
      const memories = matches.map(match => ({ date: formatDate(match.entry.createdAt), content: match.entry.content }));
      const reply = await GeminiProxyClient.getCompanionResponse(latest.content, memories);
      if (!alive) return;
      setResponse(reply); setRelated(matches.map(match => ({ id: match.entry.id, createdAt: match.entry.createdAt, content: match.entry.content })));
      await onSaveReflection(thread.id, latest.id, reply, matches.map(match => match.entry.id));
    });
    return () => { alive = false; };
  }, [thread, latest?.id, getPastThoughts, onSaveReflection]);
  if (!thread || !latest) return null;

  const openContinuation = () => {
    setContinuing(true);
    window.setTimeout(() => continuationRef.current?.focus(), 0);
  };
  const saveContinuation = async () => {
    const text = continuation.trim();
    if (!text) return;
    await onContinue(thread.id, text);
    setContinuation('');
    setContinuing(false);
  };

  return <div className="w-full max-w-[560px] min-h-[calc(100vh-104px)] flex flex-col py-4">
    <div className="flex-1 pt-10 sm:pt-16">
      <div className="flex items-center gap-2 text-accent"><span className="w-7 h-7 rounded-full bg-accent/10 flex items-center justify-center"><Check size={16} strokeWidth={2}/></span><span className="text-sm font-medium">已停靠</span></div>
      <h1 className="mt-6 text-[30px] sm:text-[36px] font-medium tracking-[-0.045em] text-ink">已經留下了。</h1>
      <p className="mt-3 text-[15px] text-ink-secondary">不用現在想完。</p>

      <article className="mt-12 border-l-2 border-ink pl-5"><time className="text-xs text-ink-muted">剛剛</time><p className="mt-2 text-[22px] leading-[1.6] tracking-[-0.02em] text-ink whitespace-pre-wrap">{latest.content}</p></article>

      <section className="mt-10 pt-5 border-t border-border-base">
        <div className="flex items-center gap-2 text-sm text-accent"><MessageCircle size={16} strokeWidth={1.6}/><span className="font-medium">它記得</span></div>
        {response ? <p className="mt-3 max-w-[480px] text-[16px] leading-[1.75] text-ink-secondary">{response}</p> : <p className="mt-3 text-sm text-ink-muted">正在整理這一刻的脈絡…</p>}
        {related[0] && <div className="mt-5 pl-4 border-l border-accent/30"><p className="text-xs text-ink-muted">想起 {formatDate(related[0].createdAt)} 的一句話</p><p className="mt-1.5 text-[15px] leading-relaxed text-ink">「{related[0].content}」</p><button onClick={async()=>{await onDismissRelatedMemory(thread.id, latest.id, related[0].id); setRelated([]); setResponse('我先把這一刻留在這裡。想接著說，或先放著都可以。');}} className="mt-3 text-xs text-ink-muted underline underline-offset-4 hover:text-ink">不是同一件事</button></div>}
      </section>

      <section className="mt-8">
        {continuing ? <div className="rounded-2xl border border-border-base bg-surface p-4 shadow-sm"><label htmlFor="continue-thought" className="text-sm font-medium text-ink">接著說</label><textarea ref={continuationRef} id="continue-thought" value={continuation} onChange={event=>setContinuation(event.target.value)} onKeyDown={event=>{if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void saveContinuation(); }}} placeholder="還想留下什麼？" rows={3} className="mt-3 w-full resize-none bg-transparent text-[16px] leading-relaxed text-ink outline-none placeholder:text-ink-muted"/><div className="mt-3 flex items-center justify-between border-t border-border-base pt-3"><button onClick={()=>{setContinuing(false);setContinuation('');}} className="text-sm text-ink-muted hover:text-ink">先不說了</button><button onClick={()=>void saveContinuation()} disabled={!continuation.trim()} className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-accent px-4 text-sm font-medium text-white disabled:opacity-35">留下 <ArrowUp size={15}/></button></div></div> : <div className="flex items-center gap-3"><button onClick={openContinuation} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-accent px-5 text-sm font-medium text-white shadow-sm transition-transform active:scale-[0.98]"><MessageCircle size={16}/>接著說</button><button onClick={onReset} className="inline-flex min-h-11 items-center rounded-full px-3 text-sm font-medium text-ink-secondary hover:bg-surface-subtle hover:text-ink">先放著</button></div>}
      </section>

      <section className="mt-9"><button onClick={()=>setShowPrompts(value=>!value)} className="text-sm text-ink-secondary hover:text-ink transition-colors flex items-center gap-2"><Sparkles size={15} className="text-accent"/>想多看一個角度</button>{showPrompts && <div className="mt-4"><ThoughtPrompts contextText={latest.content}/></div>}</section>
      <button onClick={onReview} className="mt-8 inline-flex min-h-11 items-center gap-2 text-sm text-ink-secondary hover:text-ink"><History size={16} />回頭看看以前留下的事</button>
    </div>
  </div>;
};
