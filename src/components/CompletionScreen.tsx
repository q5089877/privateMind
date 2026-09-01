import React, { useEffect, useState } from 'react';
import { Check, MessageCircle, Sparkles } from 'lucide-react';
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
      const clean = normalizeCompanionResponse(latest.aiResponse);
      setResponse(clean);
      if (clean !== latest.aiResponse) void onSaveReflection(thread.id, latest.id, clean, latest.relatedEntryIds || []);
      if (latest.relatedEntryIds?.length) {
        void getPastThoughts().then(all => {
          const byId = new Map(all.flatMap(item => item.entries).map(entry => [entry.id, entry]));
          setRelated(latest.relatedEntryIds!.map(id => byId.get(id)).filter((entry): entry is NonNullable<typeof entry> => Boolean(entry)).map(entry => ({ id: entry.id, createdAt: entry.createdAt, content: entry.content })));
        });
      }
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
  return <div className="w-full max-w-xl py-10 flex flex-col items-center text-center space-y-6">
    <div className="w-12 h-12 rounded-full bg-accent/10 text-accent flex items-center justify-center"><Check size={24}/></div>
    <div><p className="text-xl font-medium text-ink">停好了。</p><p className="text-sm text-ink-secondary mt-2">不用現在想完。</p></div>
    <article className="w-full text-left rounded-3xl bg-surface border border-border-subtle px-5 py-4"><time className="text-xs text-ink-muted">剛剛</time><p className="text-lg leading-relaxed text-ink mt-2 whitespace-pre-wrap">{latest.content}</p></article>
    <section className="w-full text-left rounded-2xl bg-accent/5 border border-accent/15 px-4 py-4"><div className="flex items-center gap-2 text-sm text-accent"><MessageCircle size={16}/><span>思緒停靠</span></div>{response ? <p className="text-[15px] leading-relaxed text-ink mt-3">{response}</p> : <p className="text-sm text-ink-secondary mt-3">正在看看這一刻的脈絡…</p>}{related[0] && <div className="mt-3 border-l-2 border-accent/25 pl-3"><p className="text-xs text-ink-muted">想起你在 {formatDate(related[0].createdAt)} 留下的：</p><p className="mt-1 text-sm leading-relaxed text-ink-secondary">「{related[0].content}」</p><button onClick={async()=>{await onDismissRelatedMemory(thread.id, latest.id, related[0].id); setRelated([]); setResponse('我先把這一刻留在這裡。想接著說，或先放著都可以。');}} className="mt-2 text-xs text-ink-muted hover:text-ink">不是同一件事</button></div>}</section>
    <div className="w-full text-left"><button onClick={()=>setShowPrompts(value=>!value)} className="text-sm text-ink-secondary hover:text-ink flex items-center gap-2 mx-auto"><Sparkles size={15} className="text-accent"/>想多看一個角度？</button>{showPrompts && <div className="mt-3"><ThoughtPrompts contextText={latest.content}/></div>}</div>
    <button onClick={onReset} className="text-sm text-ink-secondary hover:text-ink py-2">到這裡就好</button>
  </div>;
};
