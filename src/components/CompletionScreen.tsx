import React, { useEffect, useState } from 'react';
import { ArrowLeft, Check, MessageCircle, Sparkles } from 'lucide-react';
import { ThoughtThread } from '../types';
import { ThoughtPrompts } from './ThoughtPrompts';
import { GeminiProxyClient, normalizeCompanionResponse } from '../logic/geminiProxyClient';
import { findRelatedMoments } from '../logic/memory';

interface RelatedMemory { id: string; createdAt: number; content: string; }
interface Props { thread: ThoughtThread | null; onReset: () => void; getPastThoughts: () => Promise<ThoughtThread[]>; onSaveReflection: (threadId: string, entryId: string, response: string, relatedIds: string[]) => Promise<void>; onDismissRelatedMemory: (threadId: string, entryId: string, sourceId: string) => Promise<void>; }
const formatDate = (time: number) => new Intl.DateTimeFormat('zh-TW', { month: 'numeric', day: 'numeric' }).format(new Date(time));

export const CompletionScreen: React.FC<Props> = ({ thread, onReset, getPastThoughts, onSaveReflection, onDismissRelatedMemory }) => {
  const [response, setResponse] = useState(''); const [related, setRelated] = useState<RelatedMemory[]>([]); const [showPrompts, setShowPrompts] = useState(false);
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

      <section className="mt-9"><button onClick={()=>setShowPrompts(value=>!value)} className="text-sm text-ink-secondary hover:text-ink transition-colors flex items-center gap-2"><Sparkles size={15} className="text-accent"/>想多看一個角度</button>{showPrompts && <div className="mt-4"><ThoughtPrompts contextText={latest.content}/></div>}</section>
    </div>
    <button onClick={onReset} className="self-start min-h-11 text-sm text-ink-secondary hover:text-ink flex items-center gap-1.5"><ArrowLeft size={16}/>回到現在</button>
  </div>;
};
