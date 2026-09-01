import React, { useEffect, useRef, useState } from 'react';
import { ArrowDown, MoreHorizontal, Plus, Waves } from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';
import { UI_TEXT } from '../config/textConfig';
import { MomentIntent, ThoughtThread } from '../types';

interface Props { onStartInput: (text: string) => void; onAppend: (id: string, text: string, intent: MomentIntent) => Promise<void>; onReview: () => void; getPastThoughts: () => Promise<ThoughtThread[]>; }
const labels: Record<Exclude<MomentIntent, 'captured'>, string> = { reappeared: '又想到', follow_up: '有後續', context_added: '補充一下' };

export const HomeScreen: React.FC<Props> = ({ onStartInput, onAppend, onReview, getPastThoughts }) => {
  const [input, setInput] = useState(''); const [target, setTarget] = useState<ThoughtThread | null>(null); const [intent, setIntent] = useState<Exclude<MomentIntent, 'captured'>>('reappeared'); const [recent, setRecent] = useState<ThoughtThread[]>([]); const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { void getPastThoughts().then(items => setRecent(items.filter(item => !item.isArchived).sort((a,b) => b.updatedAt-a.updatedAt).slice(0, 3))); }, [getPastThoughts]);
  useEffect(() => { ref.current?.focus(); }, [target]);
  const save = async () => { if (!input.trim()) return; triggerHaptic('docking'); if (target) await onAppend(target.id, input, intent); else onStartInput(input); setInput(''); setTarget(null); };
  return <div className="w-full max-w-[500px] flex flex-col min-h-[calc(100vh-104px)] py-2">
    <header className="flex items-center justify-between"><div className="flex items-center gap-2.5"><div className="w-10 h-10 rounded-2xl bg-accent text-accent-text flex items-center justify-center"><Waves size={21}/></div><div><p className="text-base font-semibold text-ink">思緒停靠</p><p className="text-xs tracking-[0.14em] text-ink-muted">MIND HARBOR</p></div></div><button onClick={onReview} className="w-10 h-10 rounded-2xl flex items-center justify-center text-ink-secondary hover:bg-surface"><MoreHorizontal size={21}/></button></header>
    <main className="w-full my-auto py-8 sm:py-12 space-y-5"><section className="px-1"><p className="text-sm text-accent font-medium mb-3">不必想清楚</p><h1 className="text-[34px] sm:text-[40px] font-semibold tracking-[-0.045em] text-ink leading-[1.12]">現在腦中<br/>有什麼？</h1><p className="text-base text-ink-secondary mt-3">先放在這裡。要不要回來看，由你決定。</p></section>
      {target && <section className="rounded-2xl border border-accent/25 bg-accent/5 px-4 py-3"><p className="text-xs text-ink-muted">接在這件事後面</p><p className="text-sm text-ink mt-1 line-clamp-1">{target.entries[0]?.content}</p><div className="flex gap-2 mt-3">{(Object.keys(labels) as Array<Exclude<MomentIntent,'captured'>>).map(key => <button key={key} onClick={() => setIntent(key)} className={`text-xs px-2.5 py-1 rounded-full ${intent===key ? 'bg-accent text-accent-text' : 'bg-surface text-ink-secondary'}`}>{labels[key]}</button>)}<button onClick={() => setTarget(null)} className="ml-auto text-xs text-ink-muted">改成新的</button></div></section>}
      <section className="relative overflow-hidden rounded-[32px] bg-surface border border-white p-5 sm:p-6 shadow-[0_18px_48px_rgba(37,67,49,0.10)]"><p className="text-sm font-medium text-ink-secondary mb-3">{target ? labels[intent] : '此刻的念頭'}</p><textarea ref={ref} rows={3} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();void save();}}} placeholder={UI_TEXT.home.inputPlaceholder} className="w-full bg-transparent text-[18px] leading-[1.7] text-ink outline-none resize-none border-none p-0"/><div className="pt-5 mt-3 border-t border-border-subtle"><button onClick={()=>void save()} className="w-full py-4 rounded-2xl bg-accent text-accent-text hover:bg-accent-hover text-[17px] font-semibold flex justify-center items-center gap-2">放下 <ArrowDown size={18}/></button></div></section>
      {!target && recent.length > 0 && <section className="space-y-2"><p className="text-sm text-ink-secondary px-1">最近還在心上的</p>{recent.map(item => <button key={item.id} onClick={()=>setTarget(item)} className="w-full text-left flex items-center gap-2 px-4 py-3 rounded-2xl bg-surface/70 border border-border-subtle hover:bg-surface"><Plus size={15} className="text-accent"/><span className="text-sm text-ink truncate">{item.entries[item.entries.length-1]?.content}</span></button>)}</section>}
    </main><button onClick={onReview} className="text-sm text-ink-muted hover:text-ink py-3">看看留下來的時間流</button>
  </div>;
};
