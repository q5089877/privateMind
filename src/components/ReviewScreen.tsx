import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Link2, Waves } from 'lucide-react';
import { Moment, ThreadLine } from '../types';

interface Props {
  onClose: () => void;
  getMoments: () => Promise<Moment[]>;
  getLines: () => Promise<ThreadLine[]>;
  onOpenLine: (lineId: string) => void;
  onCreateManualLine: (momentIds: string[]) => Promise<void>;
  onOpenBackup: () => void;
}

const date = (stamp: number) => new Intl.DateTimeFormat('zh-TW', { month: 'numeric', day: 'numeric' }).format(new Date(stamp));
const time = (stamp: number) => new Intl.DateTimeFormat('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(stamp));

export const ReviewScreen: React.FC<Props> = ({ onClose, getMoments, getLines, onOpenLine, onCreateManualLine, onOpenBackup }) => {
  const [moments, setMoments] = useState<Moment[]>([]);
  const [lines, setLines] = useState<ThreadLine[]>([]);
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  useEffect(() => { void Promise.all([getMoments(), getLines()]).then(([savedMoments, savedLines]) => { setMoments(savedMoments); setLines(savedLines); }); }, [getMoments, getLines]);
  const grouped = useMemo(() => moments.reduce<Record<string, Moment[]>>((groups, moment) => { const key = date(moment.createdAt); (groups[key] ||= []).push(moment); return groups; }, {}), [moments]);
  const toggle = (id: string) => setSelected(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id]);
  const finishSelection = () => { setSelecting(false); setSelected([]); };

  return <div className="w-full max-w-[640px] mx-auto pb-20">
    <header className="h-12 flex items-center justify-between"><button onClick={onClose} className="min-h-11 px-1 text-sm text-ink-secondary hover:text-ink flex items-center gap-1.5"><ArrowLeft size={16}/>現在</button><div className="flex items-center gap-2"><button onClick={() => selecting ? finishSelection() : setSelecting(true)} className="min-h-11 px-2 text-sm text-ink-secondary hover:text-ink">{selecting ? '取消選取' : '放在一起看'}</button><button onClick={onOpenBackup} className="min-h-11 px-2 text-sm text-ink-muted hover:text-ink">資料與備份</button></div></header>
    <div className="mt-12 mb-12"><div className="flex items-center gap-2 text-accent"><Waves size={18} strokeWidth={1.5}/><span className="text-sm font-medium">回看</span></div><h1 className="text-[30px] sm:text-[36px] font-medium tracking-[-0.045em] text-ink mt-5">事情怎麼走到今天</h1><p className="max-w-md text-[15px] leading-relaxed text-ink-secondary mt-3">每一段都留在原本的時間位置；連結只是另一種回看的方式。</p></div>

    {lines.length > 0 && <section className="mb-12"><p className="text-sm text-ink-secondary">已放在一起的片段</p><div className="mt-3 flex flex-wrap gap-2">{lines.map(line => <button key={line.id} onClick={() => onOpenLine(line.id)} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-border-base bg-surface px-4 text-sm text-ink-secondary hover:border-accent/40 hover:text-ink"><Link2 size={14} className="text-accent"/>{line.momentIds.length} 段記錄</button>)}</div></section>}

    {selecting && <p className="mb-7 rounded-2xl bg-surface-subtle px-4 py-3 text-sm leading-relaxed text-ink-secondary">選兩段以上；系統只會把原文並排，不替它們命名。</p>}
    {moments.length === 0 ? <p className="py-20 border-t border-border-base text-sm text-ink-muted">這裡還沒有留下任何事。</p> : <div className="space-y-10">{(Object.entries(grouped) as Array<[string, Moment[]]>).map(([day, entries]) => <section key={day} className="relative border-l border-accent/25 pl-5"><span className="absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full bg-accent ring-4 ring-canvas"/><p className="text-sm text-ink-secondary">{day}</p><div className="mt-4 space-y-4">{entries.map(moment => <article key={moment.id} onClick={() => selecting && toggle(moment.id)} className={`border-l border-border-subtle pl-4 ${selecting ? 'cursor-pointer rounded-r-2xl py-2 pr-3 transition-colors hover:bg-surface-subtle' : ''} ${selected.includes(moment.id) ? 'bg-surface-subtle' : ''}`}><time className="text-xs text-ink-muted">{time(moment.createdAt)}</time><p className="mt-1 text-[17px] leading-relaxed text-ink whitespace-pre-wrap">{moment.content}</p>{selecting && <p className="mt-2 text-xs text-accent">{selected.includes(moment.id) ? '已選取' : '點一下選取'}</p>}</article>)}</div></section>)}</div>}
    {selecting && selected.length >= 2 && <div className="sticky bottom-4 mt-8 flex justify-center"><button onClick={() => void onCreateManualLine(selected)} className="inline-flex min-h-12 items-center rounded-full bg-accent px-6 text-sm font-medium text-white shadow-lg">把這 {selected.length} 段放在一起</button></div>}
  </div>;
};
