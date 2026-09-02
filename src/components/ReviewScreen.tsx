import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Check, Link2, MoreHorizontal, Waves } from 'lucide-react';
import { Moment, ThreadLine } from '../types';

interface Props {
  onClose: () => void;
  getMoments: () => Promise<Moment[]>;
  getLines: () => Promise<ThreadLine[]>;
  onOpenLine: (lineId: string) => void;
  onCreateManualLine: (momentIds: string[]) => Promise<void>;
  onOpenBackup: () => void;
}

interface VisibleLine { line: ThreadLine; moments: Moment[]; startedAt: number; }
type TimelineItem = { kind: 'line'; value: VisibleLine; startedAt: number } | { kind: 'moment'; value: Moment; startedAt: number };

const date = (stamp: number) => new Intl.DateTimeFormat('zh-TW', { month: 'numeric', day: 'numeric' }).format(new Date(stamp));
const time = (stamp: number) => new Intl.DateTimeFormat('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(stamp));

export const ReviewScreen: React.FC<Props> = ({ onClose, getMoments, getLines, onOpenLine, onCreateManualLine, onOpenBackup }) => {
  const [moments, setMoments] = useState<Moment[]>([]);
  const [lines, setLines] = useState<ThreadLine[]>([]);
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    void Promise.all([getMoments(), getLines()]).then(([savedMoments, savedLines]) => {
      setMoments(savedMoments);
      setLines(savedLines);
    });
  }, [getMoments, getLines]);

  const groupedMoments = useMemo(() => moments.reduce<Record<string, Moment[]>>((groups, moment) => {
    const key = date(moment.createdAt);
    (groups[key] ||= []).push(moment);
    return groups;
  }, {}), [moments]);

  const timeline = useMemo(() => {
    const byId = new Map(moments.map(moment => [moment.id, moment]));
    const usedMomentIds = new Set<string>();
    const linesWithMoments: VisibleLine[] = lines.map(line => {
      const lineMoments = line.momentIds.map(id => byId.get(id)).filter((moment): moment is Moment => Boolean(moment)).sort((a, b) => a.createdAt - b.createdAt);
      return { line, moments: lineMoments, startedAt: lineMoments[0]?.createdAt || line.createdAt };
    }).filter(item => item.moments.length >= 2).sort((a, b) => a.startedAt - b.startedAt);

    // A Moment is rendered once in the master flow. A confirmed line gives its entries a shared visual container.
    const visibleLines = linesWithMoments.filter(item => item.moments.every(moment => !usedMomentIds.has(moment.id)) && item.moments.every(moment => { usedMomentIds.add(moment.id); return true; }));
    const items: TimelineItem[] = [
      ...visibleLines.map(item => ({ kind: 'line' as const, value: item, startedAt: item.startedAt })),
      ...moments.filter(moment => !usedMomentIds.has(moment.id)).map(moment => ({ kind: 'moment' as const, value: moment, startedAt: moment.createdAt }))
    ].sort((a, b) => b.startedAt - a.startedAt);

    return items.reduce<Record<string, TimelineItem[]>>((groups, item) => {
      const key = date(item.startedAt);
      (groups[key] ||= []).push(item);
      return groups;
    }, {});
  }, [lines, moments]);

  const toggle = (id: string) => setSelected(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id]);
  const cancelSelection = () => { setSelecting(false); setSelected([]); };
  const beginSelection = () => { setMenuOpen(false); setSelecting(true); };

  return <div className="w-full max-w-[640px] mx-auto pb-20">
    <header className="relative flex h-12 items-center justify-between">
      <button onClick={onClose} className="flex min-h-11 items-center gap-1.5 px-1 text-sm text-ink-secondary hover:text-ink"><ArrowLeft size={16}/>現在</button>
      <button onClick={() => setMenuOpen(value => !value)} aria-label="更多選項" className="flex h-11 w-11 items-center justify-center text-ink-muted hover:text-ink"><MoreHorizontal size={21}/></button>
      {menuOpen && <div className="absolute right-0 top-11 z-10 w-48 rounded-2xl border border-border-base bg-surface p-1.5 shadow-[0_12px_28px_rgba(34,48,38,0.14)]"><button onClick={beginSelection} className="w-full rounded-xl px-3 py-2.5 text-left text-sm text-ink-secondary hover:bg-surface-subtle">把幾段放在一起</button><button onClick={onOpenBackup} className="w-full rounded-xl px-3 py-2.5 text-left text-sm text-ink-secondary hover:bg-surface-subtle">資料與備份</button></div>}
    </header>

    <div className="mt-10 mb-10"><div className="flex items-center gap-2 text-accent"><Waves size={18} strokeWidth={1.5}/><span className="text-sm font-medium">回看</span></div><h1 className="mt-5 text-[30px] sm:text-[36px] font-medium tracking-[-0.045em] text-ink">事情怎麼走到今天</h1><p className="mt-3 max-w-md text-[15px] leading-relaxed text-ink-secondary">每一段都留在原本的時間位置。</p></div>

    {selecting && <div className="mb-7 flex items-center justify-between rounded-2xl bg-surface-subtle px-4 py-3"><p className="text-sm leading-relaxed text-ink-secondary">選兩段以上；只會並排原文，不替它們命名。</p><button onClick={cancelSelection} className="ml-3 shrink-0 text-sm text-ink-muted hover:text-ink">取消</button></div>}

    {moments.length === 0 ? <p className="py-20 border-t border-border-base text-sm text-ink-muted">這裡還沒有留下任何事。</p> : selecting ? <div className="space-y-10">{(Object.entries(groupedMoments) as Array<[string, Moment[]]>).map(([day, entries]) => <section key={day} className="relative border-l border-accent/25 pl-5"><span className="absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full bg-accent ring-4 ring-canvas"/><p className="text-sm text-ink-secondary">{day}</p><div className="mt-4 space-y-5">{entries.map(moment => { const selectedHere = selected.includes(moment.id); return <article key={moment.id} onClick={() => toggle(moment.id)} className={`cursor-pointer rounded-r-2xl border-l border-border-subtle py-2 pr-3 pl-4 transition-colors hover:bg-surface-subtle ${selectedHere ? 'bg-surface-subtle' : ''}`}><time className="text-xs text-ink-muted">{time(moment.createdAt)}</time><p className="mt-1 text-[17px] leading-relaxed text-ink whitespace-pre-wrap">{moment.content}</p><p className="mt-2 flex items-center gap-1.5 text-xs text-accent">{selectedHere && <Check size={13}/>} {selectedHere ? '已選取' : '點一下選取'}</p></article>; })}</div></section>)}</div> : <div className="space-y-10">{(Object.entries(timeline) as Array<[string, TimelineItem[]]>).map(([day, items]) => <section key={day} className="relative border-l border-accent/25 pl-5"><span className="absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full bg-accent ring-4 ring-canvas"/><p className="text-sm text-ink-secondary">{day}</p><div className="mt-4 space-y-6">{items.map(item => item.kind === 'moment' ? <article key={item.value.id} className="border-l border-border-subtle pl-4"><time className="text-xs text-ink-muted">{time(item.value.createdAt)}</time><p className="mt-1 text-[17px] leading-relaxed text-ink whitespace-pre-wrap">{item.value.content}</p></article> : <article key={item.value.line.id} className="rounded-[26px] border border-border-base bg-surface px-5 py-5 shadow-[0_3px_10px_rgba(47,70,54,0.06)]"><div className="flex items-center gap-2 text-xs text-ink-muted"><Link2 size={14} className="text-accent"/>從 {date(item.value.startedAt)} 開始 · {item.value.moments.length} 個片段</div><div className="mt-5 space-y-4">{item.value.moments.map(moment => <div key={moment.id} className="border-l border-border-subtle pl-4"><time className="text-xs text-ink-muted">{date(moment.createdAt)} {time(moment.createdAt)}</time><p className="mt-1 text-[17px] leading-relaxed text-ink whitespace-pre-wrap">{moment.content}</p></div>)}</div><button onClick={() => onOpenLine(item.value.line.id)} className="mt-5 inline-flex min-h-9 items-center gap-1.5 text-xs text-ink-muted hover:text-accent"><Link2 size={13}/>把這幾段攤開看</button></article>)}</div></section>)}</div>}

    {selecting && selected.length >= 2 && <div className="sticky bottom-4 mt-8 flex justify-center"><button onClick={() => void onCreateManualLine(selected)} className="inline-flex min-h-12 items-center rounded-full bg-accent px-6 text-sm font-medium text-white shadow-lg">把這 {selected.length} 段放在一起</button></div>}
  </div>;
};
