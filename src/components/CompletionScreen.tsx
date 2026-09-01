import React, { useEffect, useState } from 'react';
import { Check, MessageCircle, Sparkles } from 'lucide-react';
import { ThoughtThread } from '../types';
import { ThoughtPrompts } from './ThoughtPrompts';
import { GeminiProxyClient, normalizeCompanionResponse } from '../logic/geminiProxyClient';
import { findRelatedMoments } from '../logic/memory';

interface Props { thread: ThoughtThread | null; onReset: () => void; getPastThoughts: () => Promise<ThoughtThread[]>; onSaveReflection: (threadId: string, entryId: string, response: string, relatedIds: string[]) => Promise<void>; }
const formatDate = (time: number) => new Intl.DateTimeFormat('zh-TW', { month: 'numeric', day: 'numeric' }).format(new Date(time));

export const CompletionScreen: React.FC<Props> = ({ thread, onReset, getPastThoughts, onSaveReflection }) => {
  const [response, setResponse] = useState(''); const [related, setRelated] = useState<Array<{ createdAt: number; content: string }>>([]); const [showPrompts, setShowPrompts] = useState(false);
  const latest = thread?.entries[thread.entries.length - 1];
  useEffect(() => {
    if (!thread || !latest) return;
    if (latest.aiResponse) {
      const clean = normalizeCompanionResponse(latest.aiResponse);
      setResponse(clean);
      if (clean !== latest.aiResponse) void onSaveReflection(thread.id, latest.id, clean, latest.relatedEntryIds || []);
      return;
    }
    let alive = true;
    void getPastThoughts().then(async all => {
      const matches = findRelatedMoments(latest.content, all, latest.id);
      const memories = matches.map(match => ({ date: formatDate(match.entry.createdAt), content: match.entry.content }));
      const reply = await GeminiProxyClient.getCompanionResponse(latest.content, memories);
      if (!alive) return;
      setResponse(reply); setRelated(memories);
      await onSaveReflection(thread.id, latest.id, reply, matches.map(match => match.entry.id));
    });
    return () => { alive = false; };
  }, [thread, latest?.id, getPastThoughts, onSaveReflection]);
  if (!thread || !latest) return null;
  return <div className="w-full max-w-xl py-10 flex flex-col items-center text-center space-y-6">
    <div className="w-12 h-12 rounded-full bg-accent/10 text-accent flex items-center justify-center"><Check size={24}/></div>
    <div><p className="text-xl font-medium text-ink">停好了。</p><p className="text-sm text-ink-secondary mt-2">不用現在想完。</p></div>
    <article className="w-full text-left rounded-3xl bg-surface border border-border-subtle px-5 py-4"><time className="text-xs text-ink-muted">剛剛</time><p className="text-lg leading-relaxed text-ink mt-2 whitespace-pre-wrap">{latest.content}</p></article>
    <section className="w-full text-left rounded-2xl bg-accent/5 border border-accent/15 px-4 py-4"><div className="flex items-center gap-2 text-sm text-accent"><MessageCircle size={16}/><span>思緒停靠</span></div>{response ? <p className="text-[15px] leading-relaxed text-ink mt-3">{response}</p> : <p className="text-sm text-ink-secondary mt-3">正在看看這一刻的脈絡…</p>}{related.length > 0 && <p className="text-xs text-ink-muted mt-3">記得你在 {related.map(item => formatDate(item.createdAt)).join('、')} 留下的片段。</p>}</section>
    <div className="w-full text-left"><button onClick={()=>setShowPrompts(value=>!value)} className="text-sm text-ink-secondary hover:text-ink flex items-center gap-2 mx-auto"><Sparkles size={15} className="text-accent"/>想多看一個角度？</button>{showPrompts && <div className="mt-3"><ThoughtPrompts contextText={latest.content}/></div>}</div>
    <button onClick={onReset} className="text-sm text-ink-secondary hover:text-ink py-2">到這裡就好</button>
  </div>;
};
