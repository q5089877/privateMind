import React, { useEffect, useState } from 'react';
import { Check, Link2, Sparkles } from 'lucide-react';
import { ThoughtThread } from '../types';
import { ThoughtPrompts } from './ThoughtPrompts';

interface Props { thread: ThoughtThread | null; onReset: () => void; onAttach: (id: string) => Promise<void>; getPastThoughts: () => Promise<ThoughtThread[]>; }

const words = (text: string) => {
  const chunks = text.toLowerCase().split(/[\s，。！？、,.!?]+/).filter(Boolean);
  return chunks.flatMap(chunk => {
    const latin = chunk.match(/[a-z0-9]{2,}/g) || [];
    const cjk = chunk.replace(/[^\u4e00-\u9fff]/g, '');
    const pairs = Array.from({ length: Math.max(0, cjk.length - 1) }, (_, index) => cjk.slice(index, index + 2));
    return [...latin, ...pairs];
  });
};
const related = (current: ThoughtThread, all: ThoughtThread[]) => {
  const source = new Set(words(current.entries[0]?.content || ''));
  return all.filter(item => item.id !== current.id && !item.isArchived).map(item => ({ item, score: words(item.entries.map(entry => entry.content).join(' ')).filter(word => source.has(word)).length })).filter(item => item.score > 0).sort((a,b) => b.score-a.score).slice(0, 2).map(item => item.item);
};

export const CompletionScreen: React.FC<Props> = ({ thread, onReset, onAttach, getPastThoughts }) => {
  const [showPrompts, setShowPrompts] = useState(false); const [candidates, setCandidates] = useState<ThoughtThread[]>([]); const [attached, setAttached] = useState(false);
  useEffect(() => { if (thread) void getPastThoughts().then(items => setCandidates(related(thread, items))); }, [thread, getPastThoughts]);
  if (!thread) return null;
  const latest = thread.entries[thread.entries.length - 1];
  return <div className="w-full max-w-xl py-10 flex flex-col items-center text-center space-y-6">
    <div className="w-12 h-12 rounded-full bg-accent/10 text-accent flex items-center justify-center"><Check size={24}/></div>
    <div><p className="text-xl font-medium text-ink">停好了。</p><p className="text-sm text-ink-secondary mt-2">不用現在想完。</p></div>
    <article className="w-full text-left rounded-3xl bg-surface border border-border-subtle px-5 py-4"><time className="text-xs text-ink-muted">剛剛</time><p className="text-lg leading-relaxed text-ink mt-2 whitespace-pre-wrap">{latest?.content}</p></article>
    {!attached && candidates.length > 0 && <section className="w-full text-left rounded-2xl border border-accent/20 bg-accent/5 px-4 py-3"><p className="text-sm text-ink">這好像和之前留下的一件事有關嗎？</p><div className="mt-3 space-y-2">{candidates.map(item => <button key={item.id} onClick={async()=>{await onAttach(item.id); setAttached(true);}} className="w-full text-left text-sm px-3 py-2 rounded-xl bg-surface hover:bg-surface-hover border border-border-subtle"><Link2 size={13} className="inline mr-2 text-accent"/>{item.entries[0]?.content}</button>)}</div><button onClick={()=>setCandidates([])} className="mt-3 text-xs text-ink-muted">沒有，這是新的事</button></section>}
    {attached && <p className="text-sm text-ink-secondary">已接在原本的時間流裡。</p>}
    <div className="w-full text-left"><button onClick={()=>setShowPrompts(value=>!value)} className="text-sm text-ink-secondary hover:text-ink flex items-center gap-2 mx-auto"><Sparkles size={15} className="text-accent"/>想多看一個角度？</button>{showPrompts && <div className="mt-3"><ThoughtPrompts contextText={latest?.content}/></div>}</div>
    <button onClick={onReset} className="text-sm text-ink-secondary hover:text-ink py-2">到這裡就好</button>
  </div>;
};
