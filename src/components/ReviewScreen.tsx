import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ChevronDown, ChevronUp, HardDrive, Sparkles, Waves } from 'lucide-react';
import { HarborSession, Moment, ReviewReading } from '../types';
import { UI_TEXT } from '../config/textConfig';

interface Props {
  onClose: () => void;
  getMoments: () => Promise<Moment[]>;
  getSessions: () => Promise<HarborSession[]>;
  onOpenSession: (sessionId: string) => Promise<void>;
  onRequestReading: () => Promise<ReviewReading | null>;
  onOpenBackup: () => void;
}

type TimelineItem =
  | { kind: 'session'; session: HarborSession; primaryMoment: Moment; startedAt: number }
  | { kind: 'moment'; moment: Moment; startedAt: number };

const day = (stamp: number) => new Intl.DateTimeFormat('zh-TW', { month: 'numeric', day: 'numeric' }).format(new Date(stamp));
const time = (stamp: number) => new Intl.DateTimeFormat('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(stamp));

/** REVIEW keeps the one true timeline; AI reading is a deliberate, temporary layer over it. */
export const ReviewScreen: React.FC<Props> = ({ onClose, getMoments, getSessions, onOpenSession, onRequestReading, onOpenBackup }) => {
  const [moments, setMoments] = useState<Moment[]>([]);
  const [sessions, setSessions] = useState<HarborSession[]>([]);
  const [expanded, setExpanded] = useState<string[]>([]);
  const [reading, setReading] = useState<ReviewReading | null>(null);
  const [readingState, setReadingState] = useState<'idle' | 'loading' | 'empty'>('idle');

  useEffect(() => {
    void Promise.all([getMoments(), getSessions()]).then(([savedMoments, savedSessions]) => {
      setMoments(savedMoments);
      setSessions(savedSessions);
    });
  }, [getMoments, getSessions]);

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

  const requestReading = async () => {
    setReadingState('loading');
    const next = await onRequestReading();
    setReading(next);
    setReadingState(next ? 'idle' : 'empty');
  };

  const t = UI_TEXT.review;
  const toggle = (id: string) => setExpanded(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id]);

  return <div className="w-full max-w-[640px] pb-20">
    <header className="flex h-12 items-center justify-between"><button onClick={onClose} className="flex min-h-11 items-center gap-1.5 px-1 text-sm text-ink-secondary hover:text-ink"><ArrowLeft size={16}/>{t.backBtn}</button><button onClick={onOpenBackup} className="flex min-h-11 items-center gap-1.5 px-1 text-xs text-ink-muted hover:text-ink"><HardDrive size={15}/>{t.backupBtn}</button></header>
    <main>
      <div className="mt-10"><div className="flex items-center gap-2 text-accent"><Waves size={18}/><span className="text-sm font-medium">{t.tag}</span></div><h1 className="mt-5 text-[32px] font-medium tracking-[-0.05em] text-ink sm:text-[40px]">{t.heroTitle}</h1><p className="mt-3 max-w-md text-[16px] leading-relaxed text-ink-secondary">{t.heroSubtitle}</p></div>

      <section className="mt-10 rounded-[28px] border border-accent/20 bg-accent/5 p-5"><div className="flex items-center gap-2 text-sm font-medium text-accent"><Sparkles size={16}/>{t.insightCardTitle}</div><p className="mt-2 max-w-lg text-sm leading-relaxed text-ink-secondary">{t.insightCardDesc}</p>{readingState === 'loading' ? <p className="mt-5 text-sm text-ink-muted">{t.loadingHint}</p> : <button onClick={() => void requestReading()} className="mt-5 inline-flex min-h-11 items-center rounded-full bg-accent px-5 text-sm font-medium text-white shadow-sm">{t.triggerBtn}</button>}
        {reading && <div className="mt-6 border-t border-accent/15 pt-5"><p className="text-sm font-medium text-accent">{t.evidenceHeader}</p><div className="mt-3 space-y-3 border-l border-accent/30 pl-4">{reading.evidence.map((item, index) => <p key={`${item.date}-${index}`} className="text-sm leading-relaxed text-ink-secondary"><span className="text-xs text-ink-muted">{item.date}</span><br/>「{item.phrase}」</p>)}</div><div className="mt-6"><p className="text-sm font-medium text-accent">{t.angleHeader}</p><p className="mt-2 text-[17px] leading-[1.8] text-ink">{reading.angle}</p></div><div className="mt-6 border-l-2 border-accent/40 pl-4"><p className="text-sm font-medium text-accent">{t.unresolvedHeader}</p><p className="mt-2 text-[16px] leading-[1.75] text-ink-secondary">{reading.unresolved}</p></div></div>}
        {readingState === 'empty' && <p className="mt-5 border-l-2 border-border-base pl-4 text-sm leading-relaxed text-ink-secondary">{t.emptyInsight}</p>}
      </section>

      {moments.length === 0 ? <p className="mt-12 border-t border-border-base py-16 text-sm text-ink-muted">{t.emptyTimeline}</p> : <div className="mt-12 space-y-10">{(Object.entries(timeline) as Array<[string, TimelineItem[]]>).map(([date, items]) => <section key={date} className="relative border-l border-accent/25 pl-5"><span className="absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full bg-accent ring-4 ring-canvas"/><p className="text-sm text-ink-secondary">{date}</p><div className="mt-4 space-y-5">{items.map(item => {
        if (item.kind === 'moment') return <article key={item.moment.id} className="border-l border-border-subtle py-1 pl-4"><time className="text-xs text-ink-muted">{time(item.moment.createdAt)}</time><p className="mt-1 whitespace-pre-wrap text-[17px] leading-relaxed text-ink">{item.moment.content}</p></article>;
        const isExpanded = expanded.includes(item.session.id);
        const closure = item.session.closure;
        const turnCount = item.session.turns.length;
        return <article key={item.session.id} className="rounded-[26px] border border-border-base bg-surface px-5 py-5 shadow-[0_3px_10px_rgba(47,70,54,0.06)]"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2 text-xs text-ink-muted"><span>{time(item.startedAt)}</span><span className={`rounded-full px-2 py-0.5 ${closure ? 'bg-accent/10 text-accent' : 'bg-surface-subtle text-ink-secondary'}`}>{closure ? t.statusConcluded : t.statusPending}</span></div><span className="text-xs text-ink-muted">{turnCount} {t.turnCountSuffix}</span></div><p className="mt-4 whitespace-pre-wrap text-[19px] leading-[1.65] tracking-[-0.02em] text-ink">{item.primaryMoment.content}</p>{closure ? <div className="mt-5 rounded-2xl bg-surface-subtle px-4 py-4"><p className="text-xs font-medium text-accent">{t.takeawayHeader}</p><p className="mt-2 text-[15px] leading-[1.75] text-ink-secondary">{closure.takeaway}</p><p className="mt-3 border-l-2 border-accent/35 pl-3 text-sm leading-relaxed text-ink-muted">{closure.unresolved}</p></div> : <p className="mt-4 text-sm leading-relaxed text-ink-secondary">{t.pendingHint}</p>}<div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2"><button onClick={() => void onOpenSession(item.session.id)} className="inline-flex min-h-9 items-center gap-1.5 text-sm font-medium text-accent hover:text-ink"><Waves size={15}/>{closure ? t.continueSessionBtn : t.revisitSessionBtn}</button><button onClick={() => toggle(item.session.id)} className="inline-flex min-h-9 items-center gap-1.5 text-sm text-ink-secondary hover:text-ink">{isExpanded ? <ChevronUp size={15}/> : <ChevronDown size={15}/>}{isExpanded ? t.collapseTurnsBtn : `${t.expandTurnsPrefix}${turnCount} ${t.turnCountSuffix}`}</button></div>{isExpanded && <div className="mt-5 space-y-4 border-t border-border-base pt-5">{item.session.turns.map(turn => turn.role === 'user' ? <div key={turn.id} className="ml-4 rounded-2xl bg-surface-subtle px-4 py-3"><p className="text-xs text-ink-muted">{t.userTurnLabel}</p><p className="mt-1.5 whitespace-pre-wrap text-[15px] leading-[1.7] text-ink">{turn.content}</p></div> : <div key={turn.id} className="mr-4 border-l-2 border-accent/45 py-1 pl-3"><p className="text-xs text-accent">{t.aiTurnLabel}</p><p className="mt-1.5 whitespace-pre-wrap text-[14px] leading-[1.75] text-ink-secondary">{turn.content}</p></div>)}</div>}</article>;
      })}</div></section>)}</div>}
    </main>
  </div>;
};
