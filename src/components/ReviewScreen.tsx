import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Check, ChevronDown, ChevronUp, Link2, MoreHorizontal, Waves } from 'lucide-react';
import { HarborSession, Moment, ThreadLine } from '../types';

interface Props {
  onClose: () => void;
  getMoments: () => Promise<Moment[]>;
  getSessions: () => Promise<HarborSession[]>;
  getLines: () => Promise<ThreadLine[]>;
  onOpenSession: (sessionId: string) => Promise<void>;
  onOpenLine: (lineId: string) => void;
  onCreateManualLine: (momentIds: string[]) => Promise<void>;
  onOpenBackup: () => void;
}

type TimelineItem =
  | { kind: 'session'; session: HarborSession; primaryMoment: Moment; startedAt: number }
  | { kind: 'moment'; moment: Moment; startedAt: number };

const day = (stamp: number) => new Intl.DateTimeFormat('zh-TW', { month: 'numeric', day: 'numeric' }).format(new Date(stamp));
const time = (stamp: number) => new Intl.DateTimeFormat('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(stamp));

export const ReviewScreen: React.FC<Props> = ({ onClose, getMoments, getSessions, getLines, onOpenSession, onOpenLine, onCreateManualLine, onOpenBackup }) => {
  const [moments, setMoments] = useState<Moment[]>([]);
  const [sessions, setSessions] = useState<HarborSession[]>([]);
  const [lines, setLines] = useState<ThreadLine[]>([]);
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [expanded, setExpanded] = useState<string[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    void Promise.all([getMoments(), getSessions(), getLines()]).then(([savedMoments, savedSessions, savedLines]) => {
      setMoments(savedMoments);
      setSessions(savedSessions);
      setLines(savedLines);
    });
  }, [getMoments, getLines, getSessions]);

  const groupedMoments = useMemo(() => moments.reduce<Record<string, Moment[]>>((groups, moment) => {
    const key = day(moment.createdAt);
    (groups[key] ||= []).push(moment);
    return groups;
  }, {}), [moments]);

  const timeline = useMemo(() => {
    const byId = new Map(moments.map(moment => [moment.id, moment]));
    const sessionMomentIds = new Set(sessions.flatMap(session => session.momentIds));
    const items: TimelineItem[] = [
      ...sessions.map(session => {
        const primaryMoment = byId.get(session.originMomentId) || session.momentIds.map(id => byId.get(id)).find((moment): moment is Moment => Boolean(moment));
        return primaryMoment ? { kind: 'session' as const, session, primaryMoment, startedAt: primaryMoment.createdAt } : null;
      }).filter((item): item is Extract<TimelineItem, { kind: 'session' }> => Boolean(item)),
      ...moments.filter(moment => !sessionMomentIds.has(moment.id)).map(moment => ({ kind: 'moment' as const, moment, startedAt: moment.createdAt }))
    ].sort((left, right) => right.startedAt - left.startedAt);

    return items.reduce<Record<string, TimelineItem[]>>((groups, item) => {
      const key = day(item.startedAt);
      (groups[key] ||= []).push(item);
      return groups;
    }, {});
  }, [moments, sessions]);

  const toggleSelection = (id: string) => setSelected(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id]);
  const toggleExpanded = (id: string) => setExpanded(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id]);
  const cancelSelection = () => { setSelecting(false); setSelected([]); };
  const beginSelection = () => { setMenuOpen(false); setSelecting(true); };
  // A cross-session line is surfaced next to the Moment it starts from, not as a separate folder.
  const relatedLine = (session: HarborSession) => lines.find(line => line.momentIds.includes(session.originMomentId)) || null;

  return <div className="w-full max-w-[640px] mx-auto pb-20">
    <header className="relative flex h-12 items-center justify-between">
      <button onClick={onClose} className="flex min-h-11 items-center gap-1.5 px-1 text-sm text-ink-secondary hover:text-ink"><ArrowLeft size={16}/>現在</button>
      <button onClick={() => setMenuOpen(value => !value)} aria-label="更多選項" className="flex h-11 w-11 items-center justify-center text-ink-muted hover:text-ink"><MoreHorizontal size={21}/></button>
      {menuOpen && <div className="absolute right-0 top-11 z-10 w-48 rounded-2xl border border-border-base bg-surface p-1.5 shadow-[0_12px_28px_rgba(34,48,38,0.14)]"><button onClick={beginSelection} className="w-full rounded-xl px-3 py-2.5 text-left text-sm text-ink-secondary hover:bg-surface-subtle">把幾段連起來</button><button onClick={onOpenBackup} className="w-full rounded-xl px-3 py-2.5 text-left text-sm text-ink-secondary hover:bg-surface-subtle">資料與備份</button></div>}
    </header>

    <div className="mt-10 mb-10"><div className="flex items-center gap-2 text-accent"><Waves size={18} strokeWidth={1.5}/><span className="text-sm font-medium">回看</span></div><h1 className="mt-5 text-[30px] sm:text-[36px] font-medium tracking-[-0.045em] text-ink">事情怎麼走到今天</h1><p className="mt-3 max-w-md text-[15px] leading-relaxed text-ink-secondary">每次停靠都留在發生的位置；說過的話與暫時收束，也一起留在這裡。</p></div>

    {selecting && <div className="mb-7 flex items-center justify-between rounded-2xl bg-surface-subtle px-4 py-3"><p className="text-sm leading-relaxed text-ink-secondary">選兩段以上；原文不會被搬走或命名，只多一條可回看的連線。</p><button onClick={cancelSelection} className="ml-3 shrink-0 text-sm text-ink-muted hover:text-ink">取消</button></div>}

    {moments.length === 0 ? <p className="py-20 border-t border-border-base text-sm text-ink-muted">這裡還沒有留下任何事。</p> : selecting ? <div className="space-y-10">{(Object.entries(groupedMoments) as Array<[string, Moment[]]>).map(([date, entries]) => <section key={date} className="relative border-l border-accent/25 pl-5"><span className="absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full bg-accent ring-4 ring-canvas"/><p className="text-sm text-ink-secondary">{date}</p><div className="mt-4 space-y-5">{entries.map(moment => { const selectedHere = selected.includes(moment.id); return <article key={moment.id} onClick={() => toggleSelection(moment.id)} className={`cursor-pointer rounded-r-2xl border-l border-border-subtle py-2 pr-3 pl-4 transition-colors hover:bg-surface-subtle ${selectedHere ? 'bg-surface-subtle' : ''}`}><time className="text-xs text-ink-muted">{time(moment.createdAt)}</time><p className="mt-1 text-[17px] leading-relaxed text-ink whitespace-pre-wrap">{moment.content}</p><p className="mt-2 flex items-center gap-1.5 text-xs text-accent">{selectedHere && <Check size={13}/>} {selectedHere ? '已選取' : '點一下選取'}</p></article>; })}</div></section>)}</div> : <div className="space-y-10">{(Object.entries(timeline) as Array<[string, TimelineItem[]]>).map(([date, items]) => <section key={date} className="relative border-l border-accent/25 pl-5"><span className="absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full bg-accent ring-4 ring-canvas"/><p className="text-sm text-ink-secondary">{date}</p><div className="mt-4 space-y-5">{items.map(item => {
      if (item.kind === 'moment') return <article key={item.moment.id} className="border-l border-border-subtle py-1 pl-4"><time className="text-xs text-ink-muted">{time(item.moment.createdAt)}</time><p className="mt-1 text-[17px] leading-relaxed text-ink whitespace-pre-wrap">{item.moment.content}</p></article>;
      const isExpanded = expanded.includes(item.session.id);
      const closure = item.session.closure;
      const line = relatedLine(item.session);
      const turnCount = item.session.turns.length;
      return <article key={item.session.id} className="rounded-[26px] border border-border-base bg-surface px-5 py-5 shadow-[0_3px_10px_rgba(47,70,54,0.06)]"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2 text-xs text-ink-muted"><span>{time(item.startedAt)}</span><span className={`rounded-full px-2 py-0.5 ${closure ? 'bg-accent/10 text-accent' : 'bg-surface-subtle text-ink-secondary'}`}>{closure ? '今天先收在這裡' : '還停在這裡'}</span></div><span className="text-xs text-ink-muted">{turnCount} 則對話</span></div><p className="mt-4 text-[19px] leading-[1.65] tracking-[-0.02em] text-ink whitespace-pre-wrap">{item.primaryMoment.content}</p>{closure ? <div className="mt-5 rounded-2xl bg-surface-subtle px-4 py-4"><p className="text-xs font-medium text-accent">這次先帶走</p><p className="mt-2 text-[15px] leading-[1.75] text-ink-secondary">{closure.takeaway}</p><p className="mt-3 border-l-2 border-accent/35 pl-3 text-sm leading-relaxed text-ink-muted">{closure.unresolved}</p></div> : <p className="mt-4 text-sm leading-relaxed text-ink-secondary">這段話還留在這裡；之後若想回來，可以從原本的地方接著說。</p>}<div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2"><button onClick={() => void onOpenSession(item.session.id)} className="inline-flex min-h-9 items-center gap-1.5 text-sm font-medium text-accent hover:text-ink"><Waves size={15}/>{closure ? '從這裡接著說' : '回到這次停靠'}</button><button onClick={() => toggleExpanded(item.session.id)} className="inline-flex min-h-9 items-center gap-1.5 text-sm text-ink-secondary hover:text-ink">{isExpanded ? <ChevronUp size={15}/> : <ChevronDown size={15}/>}{isExpanded ? '收起對話' : `展開對話 · ${turnCount} 則`}</button>{line && <button onClick={() => onOpenLine(line.id)} className="inline-flex min-h-9 items-center gap-1.5 text-xs text-ink-muted hover:text-accent"><Link2 size={13}/>這句也曾被放在一起</button>}</div>{isExpanded && <div className="mt-5 space-y-4 border-t border-border-base pt-5">{item.session.turns.map(turn => turn.role === 'user' ? <div key={turn.id} className="ml-4 rounded-2xl bg-surface-subtle px-4 py-3"><p className="text-xs text-ink-muted">你留下的話</p><p className="mt-1.5 text-[15px] leading-[1.7] text-ink whitespace-pre-wrap">{turn.content}</p></div> : <div key={turn.id} className="mr-4 border-l-2 border-accent/45 py-1 pl-3"><p className="text-xs text-accent">一起看過</p><p className="mt-1.5 text-[14px] leading-[1.75] text-ink-secondary whitespace-pre-wrap">{turn.content}</p></div>)}</div>}</article>;
    })}</div></section>)}</div>}

    {selecting && selected.length >= 2 && <div className="sticky bottom-4 mt-8 flex justify-center"><button onClick={() => void onCreateManualLine(selected)} className="inline-flex min-h-12 items-center rounded-full bg-accent px-6 text-sm font-medium text-white shadow-lg">連起這 {selected.length} 段</button></div>}
  </div>;
};
