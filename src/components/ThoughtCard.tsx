import React, { useState } from 'react';
import { Archive, ArchiveRestore, ArrowLeft, ChevronDown, ChevronUp, Pencil, Sparkles, Trash2, X } from 'lucide-react';
import { ThoughtThread, MomentIntent } from '../types';
import { GeminiProxyClient, ThreadReflection } from '../logic/geminiProxyClient';

interface Props {
  thread: ThoughtThread;
  archived?: boolean;
  onAppend: (id: string, content: string, intent: MomentIntent) => Promise<void>;
  onArchive: () => Promise<void>;
  onRestore: () => Promise<void>;
  onDelete: () => Promise<void>;
  onEdit: (threadId: string, entryId: string, content: string) => Promise<void>;
}

const intentLabel: Record<MomentIntent, string> = { captured: '', reappeared: '又想到', follow_up: '', context_added: '補充' };
const date = (stamp: number) => new Intl.DateTimeFormat('zh-TW', { month: 'numeric', day: 'numeric' }).format(new Date(stamp));
const time = (stamp: number) => new Intl.DateTimeFormat('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(stamp));

export const ThoughtCard: React.FC<Props> = ({ thread, archived = false, onAppend, onArchive, onRestore, onDelete, onEdit }) => {
  const [expanded, setExpanded] = useState(true);
  const [adding, setAdding] = useState(false);
  const [text, setText] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [reflection, setReflection] = useState<ThreadReflection | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const entries = [...thread.entries].sort((a, b) => a.createdAt - b.createdAt);

  const save = async () => {
    const content = text.trim();
    if (!content) return;
    await onAppend(thread.id, content, 'follow_up');
    setText('');
    setAdding(false);
  };

  const openReflection = async () => {
    if (entries.length < 2 || analyzing) return;
    setReviewing(true);
    setAnalyzing(true);
    setReflection(null);
    const result = await GeminiProxyClient.getThreadReflection(entries.map(entry => ({ date: `${date(entry.createdAt)} ${time(entry.createdAt)}`, content: entry.content })));
    setReflection(result);
    setAnalyzing(false);
  };

  const continueWithLens = (title: string) => {
    setReviewing(false);
    setText(`我想先看「${title}」：`);
    setAdding(true);
  };

  return <>
    <section className="relative border-l border-accent/25 pl-5 pb-2">
      <span className="absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full bg-accent ring-4 ring-canvas" />
      <div className="flex items-center justify-between gap-3">
        <button onClick={() => setExpanded(value => !value)} className="min-h-8 text-left"><p className="text-xs text-ink-muted">從 {date(thread.createdAt)} 開始 · {entries.length} 個片段</p></button>
        <button onClick={() => setExpanded(value => !value)} aria-label={expanded ? '收合這段' : '展開這段'} className="p-1 text-ink-muted">{expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</button>
      </div>

      {expanded && <div className="mt-4 space-y-4">
        {entries.map((entry, index) => <div key={entry.id} className="relative border-l border-border-subtle pl-4">
          <div className="flex items-center gap-2 text-xs text-ink-muted"><span>{date(entry.createdAt)} {time(entry.createdAt)}</span>{entry.intent && intentLabel[entry.intent] && <span className="rounded-full bg-surface-subtle px-2 py-0.5">{intentLabel[entry.intent]}</span>}</div>
          {editing === entry.id ? <div className="mt-2"><textarea value={editText} onChange={event => setEditText(event.target.value)} className="w-full rounded-xl border border-border-base bg-surface p-2 text-sm outline-none" /><div className="mt-2 flex gap-2"><button onClick={async () => { await onEdit(thread.id, entry.id, editText); setEditing(null); }} className="text-xs text-accent">儲存</button><button onClick={() => setEditing(null)} className="text-xs text-ink-muted">取消</button></div></div> : <button onClick={() => { setEditing(entry.id); setEditText(entry.content); }} className="group mt-1 flex gap-2 text-left"><p className="whitespace-pre-wrap text-[16px] leading-relaxed text-ink">{entry.content}</p>{index === entries.length - 1 && <Pencil size={12} className="mt-1 opacity-0 group-hover:opacity-50" />}</button>}
        </div>)}
      </div>}

      {!archived && !adding && <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3">
        <button onClick={() => setAdding(true)} className="text-sm font-medium text-accent hover:text-accent-hover">＋ 接著說</button>
        {entries.length >= 2 && <button onClick={() => void openReflection()} className="flex items-center gap-1.5 text-sm text-ink-secondary hover:text-ink"><Sparkles size={14} className="text-accent" />一起看這 {entries.length} 段</button>}
      </div>}

      {adding && <div className="mt-4 rounded-2xl border border-border-base bg-surface p-3 shadow-sm"><textarea autoFocus value={text} onChange={event => setText(event.target.value)} placeholder="接著說……" className="w-full resize-none bg-transparent text-sm text-ink outline-none" rows={2} /><div className="mt-2 flex gap-3"><button onClick={() => void save()} className="text-xs text-accent">停靠</button><button onClick={() => { setAdding(false); setText(''); }} className="text-xs text-ink-muted">取消</button></div></div>}

      <div className="mt-5 flex gap-3 text-xs text-ink-muted">{archived ? <><button onClick={() => void onRestore()} className="flex items-center gap-1 hover:text-ink"><ArchiveRestore size={13} />放回眼前</button><button onClick={() => void onDelete()} className="flex items-center gap-1 hover:text-ink"><Trash2 size={13} />讓它消失</button></> : <button onClick={() => void onArchive()} className="flex items-center gap-1 hover:text-ink"><Archive size={13} />先別再浮出</button>}</div>
    </section>

    {reviewing && <div className="fixed inset-0 z-40 overflow-y-auto bg-canvas px-5 py-5 sm:px-8 sm:py-8">
      <div className="mx-auto flex min-h-[calc(100dvh-2.5rem)] w-full max-w-[560px] flex-col">
        <header className="flex min-h-11 items-center justify-between"><button onClick={() => setReviewing(false)} className="inline-flex items-center gap-1.5 text-sm text-ink-secondary hover:text-ink"><ArrowLeft size={16} />回到時間流</button><button onClick={() => setReviewing(false)} aria-label="關閉" className="p-2 text-ink-muted hover:text-ink"><X size={18} /></button></header>
        <main className="flex-1 pt-14 sm:pt-20">
          <div className="flex items-center gap-2 text-sm font-medium text-accent"><Sparkles size={16} />一起看這段</div>
          <h2 className="mt-5 text-[30px] font-medium tracking-[-0.045em] text-ink">先把它們分開放。</h2>
          <p className="mt-3 max-w-sm text-[15px] leading-relaxed text-ink-secondary">不是替你下結論，只把這 {entries.length} 段裡不同的方向攤開。</p>

          {analyzing && <p className="mt-14 text-sm text-ink-muted">正在找出原文裡不同的方向…</p>}
          {!analyzing && reflection && <div className="mt-12 space-y-3">
            {reflection.lenses.map((lens, index) => <button key={`${lens.title}-${index}`} onClick={() => continueWithLens(lens.title)} className="w-full rounded-3xl border border-border-base bg-surface p-5 text-left shadow-sm transition-colors hover:border-accent/40 hover:bg-surface-subtle"><p className="text-xs text-ink-muted">留下的一個方向</p><h3 className="mt-2 text-[21px] font-medium tracking-[-0.025em] text-ink">{lens.title}</h3><p className="mt-4 border-l-2 border-accent/30 pl-3 text-[15px] leading-relaxed text-ink-secondary">「{lens.sourcePhrase}」</p><p className="mt-4 text-sm font-medium text-accent">從這裡接著說 →</p></button>)}
            <p className="pt-3 text-center text-sm text-ink-muted">現在想先看哪一個？</p>
          </div>}
          {!analyzing && !reflection && <div className="mt-14 rounded-2xl border border-border-base bg-surface p-5"><p className="text-[16px] leading-relaxed text-ink-secondary">這幾段目前還沒有能穩妥分開的方向。</p><button onClick={() => setReviewing(false)} className="mt-5 text-sm font-medium text-accent">先回到時間流</button></div>}
        </main>
      </div>
    </div>}
  </>;
};
