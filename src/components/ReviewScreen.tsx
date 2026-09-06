import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, HardDrive, Waves } from 'lucide-react';
import { HarborSession, Moment, PatternMirror } from '../types';
import { UI_TEXT } from '../config/textConfig';

interface Props {
  onClose: () => void;
  getMoments: () => Promise<Moment[]>;
  getSessions: () => Promise<HarborSession[]>;
  onOpenSession: (sessionId: string) => Promise<void>;
  canShowPatternMirror: () => Promise<boolean>;
  onRequestPatternMirror: () => Promise<PatternMirror | null>;
  onSettleItem: (kind: 'moment' | 'session', id: string) => Promise<void>;
  onUnsettleItem: (kind: 'moment' | 'session', id: string) => Promise<void>;
  onDeleteItem: (kind: 'moment' | 'session', id: string) => Promise<void>;
  onOpenBackup: () => void;
}

type FeedItem =
  | { kind: 'session'; session: HarborSession; primaryMoment: Moment; ts: number }
  | { kind: 'moment'; moment: Moment; ts: number };

const dayLabel = (stamp: number) =>
  new Intl.DateTimeFormat('zh-TW', { month: 'numeric', day: 'numeric' }).format(new Date(stamp));
const timeLabel = (stamp: number) =>
  new Intl.DateTimeFormat('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(stamp));
const preview = (text: string, max = 32) =>
  text.replace(/\s+/g, ' ').trim().slice(0, max) + (text.length > max ? '…' : '');

/**
 * REVIEW: Lightweight text feed — each item is one line until tapped.
 * No structured cards, no repeated headers, no exam-paper energy.
 * Settled items are hidden from feed but preserved for Pattern analysis.
 * Deleted items are soft-deleted (backup file still contains them).
 */
export const ReviewScreen: React.FC<Props> = ({
  onClose, getMoments, getSessions, onOpenSession,
  canShowPatternMirror, onRequestPatternMirror,
  onSettleItem, onUnsettleItem, onDeleteItem, onOpenBackup
}) => {
  const [moments, setMoments] = useState<Moment[]>([]);
  const [sessions, setSessions] = useState<HarborSession[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);

  // Pattern Passive Mirroring state
  const [patternEligible, setPatternEligible] = useState(false);
  const [mirror, setMirror] = useState<PatternMirror | null>(null);
  const [mirrorOpen, setMirrorOpen] = useState(false);
  const [mirrorLoading, setMirrorLoading] = useState(false);
  const [patternIds, setPatternIds] = useState<Set<string>>(new Set());

  const reload = useCallback(() => {
    void Promise.all([getMoments(), getSessions()]).then(([m, s]) => {
      setMoments(m);
      setSessions(s);
    });
  }, [getMoments, getSessions]);

  useEffect(() => { reload(); }, [reload]);

  useEffect(() => {
    void canShowPatternMirror().then(setPatternEligible);
  }, [canShowPatternMirror]);

  const handleOpenMirror = async () => {
    if (mirror) { setMirrorOpen(true); return; }
    setMirrorLoading(true);
    const result = await onRequestPatternMirror();
    setMirrorLoading(false);
    if (result) {
      setMirror(result);
      setPatternIds(new Set(result.moments.map(m => m.id)));
      setMirrorOpen(true);
    }
  };

  const handleSettle = async (kind: 'moment' | 'session', id: string) => {
    await onSettleItem(kind, id);
    setExpanded(null);
    reload();
  };

  const handleUnsettle = async (kind: 'moment' | 'session', id: string) => {
    await onUnsettleItem(kind, id);
    reload();
  };

  const handleDelete = async (kind: 'moment' | 'session', id: string) => {
    await onDeleteItem(kind, id);
    setExpanded(null);
    setConfirming(null);
    reload();
  };

  // Build feed: filter out settled + deleted, sort newest first, group by day
  const feed = useMemo(() => {
    const byId = new Map(moments.map(m => [m.id, m]));
    const sessionMomentIds = new Set(sessions.flatMap(s => s.momentIds));
    const items: FeedItem[] = [
      ...sessions
        .filter(s => !s.settledAt && !s.deletedAt)
        .map(s => {
          const primary = byId.get(s.originMomentId)
            || s.momentIds.map(id => byId.get(id)).find((m): m is Moment => Boolean(m));
          return primary ? { kind: 'session' as const, session: s, primaryMoment: primary, ts: primary.createdAt } : null;
        })
        .filter((x): x is Extract<FeedItem, { kind: 'session' }> => Boolean(x)),
      ...moments
        .filter(m => !sessionMomentIds.has(m.id) && !m.settledAt && !m.deletedAt)
        .map(m => ({ kind: 'moment' as const, moment: m, ts: m.createdAt }))
    ].sort((a, b) => b.ts - a.ts);

    // Group by calendar day
    return items.reduce<Record<string, FeedItem[]>>((acc, item) => {
      const key = dayLabel(item.ts);
      (acc[key] ||= []).push(item);
      return acc;
    }, {});
  }, [moments, sessions]);

  // Settled items (for a collapsed "已安放" section)
  const settled = useMemo(() => [
    ...sessions.filter(s => s.settledAt && !s.deletedAt).map(s => ({ kind: 'session' as const, id: s.id, preview: preview(sessions.find(x => x.id === s.id)?.turns.find(t => t.role === 'user')?.content || '（對話）') })),
    ...moments.filter(m => m.settledAt && !m.deletedAt).map(m => ({ kind: 'moment' as const, id: m.id, preview: preview(m.content) }))
  ], [moments, sessions]);

  const [settledOpen, setSettledOpen] = useState(false);

  const t = UI_TEXT.review;

  const itemId = (item: FeedItem) => item.kind === 'session' ? item.session.id : item.moment.id;

  const renderFeedItem = (item: FeedItem) => {
    const id = itemId(item);
    const isExpanded = expanded === id;
    const isConfirming = confirming === id;
    const inPattern = patternIds.has(item.kind === 'moment' ? item.moment.id : (item as Extract<FeedItem, { kind: 'session' }>).primaryMoment.id);
    const hasClosure = item.kind === 'session' && Boolean(item.session.closure);
    const content = item.kind === 'moment' ? item.moment.content : item.primaryMoment.content;
    const takeaway = item.kind === 'session' ? item.session.closure?.takeaway : undefined;

    return (
      <div key={id} className="border-b border-border-subtle/50 last:border-0">
        {/* Single-line collapsed view */}
        <button
          onClick={() => setExpanded(isExpanded ? null : id)}
          className="flex w-full items-baseline gap-3 py-2.5 text-left"
        >
          <time className="shrink-0 text-xs text-ink-muted tabular-nums">{timeLabel(item.ts)}</time>
          <span className="min-w-0 flex-1 truncate text-[15px] leading-snug text-ink">{preview(content)}</span>
          {hasClosure && <span className="shrink-0 h-1.5 w-1.5 rounded-full bg-accent/50 mt-1" aria-label="已收束" />}
        </button>

        {/* Expanded view */}
        {isExpanded && (
          <div className="pb-4 pl-10">
            <p className="whitespace-pre-wrap text-[16px] leading-[1.75] text-ink">{content}</p>
            {takeaway && (
              <p className="mt-3 text-[14px] leading-[1.7] text-ink-secondary">{takeaway}</p>
            )}

            {/* Actions */}
            {!isConfirming ? (
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5">
                {item.kind === 'session' && (
                  <button
                    onClick={() => void onOpenSession(item.session.id)}
                    className="text-sm font-medium text-accent hover:text-ink"
                  >
                    {t.continueBtnLabel}
                  </button>
                )}
                <button
                  onClick={() => void handleSettle(item.kind, id)}
                  className="text-sm text-ink-secondary hover:text-ink"
                >
                  {t.settleBtn}
                </button>
                <button
                  onClick={() => setConfirming(id)}
                  className="text-sm text-ink-muted hover:text-red-500"
                >
                  {t.deleteBtn}
                </button>
              </div>
            ) : (
              <div className="mt-4">
                <p className="text-sm leading-relaxed text-ink-secondary">
                  {inPattern ? t.deletePatternWarning : t.deleteWarning}
                </p>
                <div className="mt-3 flex gap-4">
                  <button
                    onClick={() => void handleDelete(item.kind, id)}
                    className="text-sm font-medium text-red-500 hover:text-red-700"
                  >
                    確定刪除
                  </button>
                  <button
                    onClick={() => setConfirming(null)}
                    className="text-sm text-ink-muted hover:text-ink"
                  >
                    取消
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full max-w-[640px] pb-20">
      <header className="flex h-12 items-center justify-between">
        <button onClick={onClose} className="flex min-h-11 items-center gap-1.5 px-1 text-sm text-ink-secondary hover:text-ink">
          <ArrowLeft size={16}/>{t.backBtn}
        </button>
        <button onClick={onOpenBackup} className="flex min-h-11 items-center gap-1.5 px-1 text-xs text-ink-muted hover:text-ink">
          <HardDrive size={15}/>{t.backupBtn}
        </button>
      </header>

      <main>
        {/* Hero */}
        <div className="mt-10">
          <div className="flex items-center gap-2 text-accent"><Waves size={18}/><span className="text-sm font-medium">{t.tag}</span></div>
          <h1 className="mt-4 text-[28px] font-medium tracking-[-0.04em] text-ink">{t.heroTitle}</h1>
          <p className="mt-2 text-[15px] text-ink-secondary">{t.heroSubtitle}</p>
        </div>

        {/* Pattern Passive Mirroring — 平常 100% 隱形 */}
        {patternEligible && (
          <div className="mt-8">
            {!mirrorOpen
              ? (
                <button
                  onClick={() => void handleOpenMirror()}
                  disabled={mirrorLoading}
                  className="text-sm text-ink-muted/60 hover:text-ink-muted transition-colors duration-300 disabled:opacity-40"
                >
                  {mirrorLoading ? t.patternLoading : t.patternHint}
                </button>
              )
              : mirror && (
                <div className="rounded-[20px] border border-accent/15 bg-accent/5 p-4 space-y-4">
                  {mirror.moments.map(m => (
                    <article key={m.id} className="border-l-2 border-accent/30 pl-3">
                      <time className="text-xs text-ink-muted">{dayLabel(m.createdAt)} · {timeLabel(m.createdAt)}</time>
                      <p className="mt-1.5 whitespace-pre-wrap text-[15px] leading-relaxed text-ink">「{m.content}」</p>
                    </article>
                  ))}
                  <button onClick={() => setMirrorOpen(false)} className="text-xs text-ink-muted hover:text-ink">{t.patternCollapseBtn}</button>
                </div>
              )
            }
          </div>
        )}

        {/* Main feed */}
        {Object.keys(feed).length === 0 && settled.length === 0
          ? <p className="mt-16 text-sm text-ink-muted">{t.emptyTimeline}</p>
          : (
            <div className="mt-10 space-y-8">
              {(Object.entries(feed) as [string, FeedItem[]][]).map(([date, items]) => (
                <section key={date}>
                  <p className="mb-1 text-xs font-medium text-ink-muted">{date}</p>
                  <div>{items.map(renderFeedItem)}</div>
                </section>
              ))}
            </div>
          )
        }

        {/* Settled items — collapsed by default */}
        {settled.length > 0 && (
          <div className="mt-10 border-t border-border-subtle pt-6">
            <button
              onClick={() => setSettledOpen(v => !v)}
              className="text-xs text-ink-muted hover:text-ink"
            >
              {settledOpen ? '▾' : '▸'} 已安放 · {settled.length} 筆
            </button>
            {settledOpen && (
              <div className="mt-3 space-y-1.5">
                {settled.map(item => (
                  <div key={item.id} className="flex items-center justify-between gap-4 py-1">
                    <span className="min-w-0 flex-1 truncate text-[14px] text-ink-muted">{item.preview}</span>
                    <button
                      onClick={() => void handleUnsettle(item.kind, item.id)}
                      className="shrink-0 text-xs text-ink-muted hover:text-ink"
                    >
                      {t.unsettleBtn}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};
