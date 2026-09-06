import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, ArrowUpDown, ChevronRight, HardDrive, MessageSquare, Waves } from 'lucide-react';
import { HarborSession, Moment, PatternMirror } from '../types';

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
  | { kind: 'session'; session: HarborSession; primaryMoment: Moment; ts: number; settled: boolean; deleted: boolean }
  | { kind: 'moment'; moment: Moment; ts: number; settled: boolean; deleted: boolean };

const formatDay = (stamp: number) => {
  const d = new Date(stamp);
  return `${d.getMonth() + 1}/${d.getDate()}`;
};

const formatWeekday = (stamp: number) => {
  const days = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];
  return days[new Date(stamp).getDay()];
};

const formatTime = (stamp: number) =>
  new Intl.DateTimeFormat('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(stamp));

const preview = (text: string, max = 36) => {
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length > max ? clean.slice(0, max) + '…' : clean;
};

export const ReviewScreen: React.FC<Props> = ({
  onClose,
  getMoments,
  getSessions,
  onOpenSession,
  canShowPatternMirror,
  onRequestPatternMirror,
  onSettleItem,
  onUnsettleItem,
  onDeleteItem,
  onOpenBackup
}) => {
  const [moments, setMoments] = useState<Moment[]>([]);
  const [sessions, setSessions] = useState<HarborSession[]>([]);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'expanded' | 'settled'>('all');
  const [sortDesc, setSortDesc] = useState(true);

  // Pattern Passive Mirroring state
  const [patternEligible, setPatternEligible] = useState(false);
  const [mirror, setMirror] = useState<PatternMirror | null>(null);
  const [mirrorOpen, setMirrorOpen] = useState(false);
  const [mirrorLoading, setMirrorLoading] = useState(false);
  const [patternMomentIds, setPatternMomentIds] = useState<Set<string>>(new Set());

  const reload = useCallback(() => {
    void Promise.all([getMoments(), getSessions()]).then(([savedMoments, savedSessions]) => {
      setMoments(savedMoments);
      setSessions(savedSessions);
    });
  }, [getMoments, getSessions]);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    void canShowPatternMirror().then(setPatternEligible);
  }, [canShowPatternMirror]);

  const handleOpenMirror = async () => {
    if (mirror) {
      setMirrorOpen(true);
      return;
    }
    setMirrorLoading(true);
    const result = await onRequestPatternMirror();
    setMirrorLoading(false);
    if (result) {
      setMirror(result);
      setPatternMomentIds(new Set(result.moments.map(m => m.id)));
      setMirrorOpen(true);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSettle = async (kind: 'moment' | 'session', id: string) => {
    await onSettleItem(kind, id);
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    reload();
  };

  const handleUnsettle = async (kind: 'moment' | 'session', id: string) => {
    await onUnsettleItem(kind, id);
    reload();
  };

  const handleDelete = async (kind: 'moment' | 'session', id: string) => {
    await onDeleteItem(kind, id);
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setConfirmingId(null);
    reload();
  };

  // Convert raw data into feed items
  const allFeedItems = useMemo(() => {
    const byId = new Map(moments.map(m => [m.id, m]));
    const sessionMomentIds = new Set(sessions.flatMap(s => s.momentIds));

    const items: FeedItem[] = [
      ...sessions.map(s => {
        const primary = byId.get(s.originMomentId)
          || s.momentIds.map(id => byId.get(id)).find((m): m is Moment => Boolean(m));
        return primary ? {
          kind: 'session' as const,
          session: s,
          primaryMoment: primary,
          ts: primary.createdAt,
          settled: Boolean(s.settledAt),
          deleted: Boolean(s.deletedAt)
        } : null;
      }).filter((item): item is Extract<FeedItem, { kind: 'session' }> => Boolean(item)),
      ...moments.filter(m => !sessionMomentIds.has(m.id)).map(m => ({
        kind: 'moment' as const,
        moment: m,
        ts: m.createdAt,
        settled: Boolean(m.settledAt),
        deleted: Boolean(m.deletedAt)
      }))
    ].filter(item => !item.deleted);

    return items;
  }, [moments, sessions]);

  // Counts for pills
  const allCount = useMemo(() => allFeedItems.filter(i => !i.settled).length, [allFeedItems]);
  const settledCount = useMemo(() => allFeedItems.filter(i => i.settled).length, [allFeedItems]);

  // Filtered and sorted feed
  const timelineGroups = useMemo(() => {
    let filtered = allFeedItems;

    if (activeFilter === 'all') {
      filtered = filtered.filter(i => !i.settled);
    } else if (activeFilter === 'expanded') {
      filtered = filtered.filter(i => {
        const id = i.kind === 'session' ? i.session.id : i.moment.id;
        return expandedIds.has(id);
      });
    } else if (activeFilter === 'settled') {
      filtered = filtered.filter(i => i.settled);
    }

    filtered = [...filtered].sort((a, b) => sortDesc ? b.ts - a.ts : a.ts - b.ts);

    // Group by calendar day (e.g. "2026-09-06")
    const groups: Array<{ key: string; day: string; weekday: string; items: FeedItem[] }> = [];
    const groupMap = new Map<string, FeedItem[]>();

    for (const item of filtered) {
      const d = new Date(item.ts);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
      if (!groupMap.has(key)) {
        groupMap.set(key, []);
      }
      groupMap.get(key)!.push(item);
    }

    groupMap.forEach((items, key) => {
      const firstTs = items[0].ts;
      groups.push({
        key,
        day: formatDay(firstTs),
        weekday: formatWeekday(firstTs),
        items
      });
    });

    return groups;
  }, [allFeedItems, activeFilter, expandedIds, sortDesc]);

  const itemId = (item: FeedItem) => item.kind === 'session' ? item.session.id : item.moment.id;

  return (
    <div className="min-h-screen bg-[#F7F6F3] text-[#1E2923] flex flex-col font-sans selection:bg-[#387358]/15 selection:text-[#1E3E31] w-full">
      <div className="flex-grow flex flex-col items-center px-4 sm:px-6 max-w-[560px] mx-auto w-full pt-3 pb-12">
        {/* BEGIN: TopNavigation */}
        <header className="w-full flex h-14 items-center justify-between" data-purpose="top-navigation">
          <button
            onClick={onClose}
            className="inline-flex items-center gap-1.5 py-2 px-1 text-[14px] font-medium text-[#465950] hover:text-[#1E3E31] transition-colors group cursor-pointer"
          >
            <ArrowLeft size={18} className="transition-transform group-hover:-translate-x-0.5" />
            <span>回首頁</span>
          </button>
          <button
            onClick={onOpenBackup}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#EFECE6]/80 hover:bg-[#E7E3DC] text-[12px] font-medium text-[#5E7066] hover:text-[#1E2923] transition-all cursor-pointer"
          >
            <HardDrive size={14} />
            <span>資料與備份</span>
          </button>
        </header>
        {/* END: TopNavigation */}

        {/* BEGIN: PageHeader */}
        <section className="w-full mt-6 mb-7" data-purpose="page-title-section">
          <div className="inline-flex items-center gap-1.5 text-[#387358] bg-[#EAF2ED] px-2.5 py-1 rounded-md text-[13px] font-semibold tracking-wide">
            <Waves size={16} />
            <span>回看</span>
          </div>
          <h1 className="mt-3.5 text-[32px] font-semibold tracking-tight text-[#162920] leading-tight">
            你留下的樣子
          </h1>
          <p className="mt-1.5 text-[15px] text-[#697B72] font-normal">
            想路過哪裡，就停一下。
          </p>
        </section>
        {/* END: PageHeader */}

        {/* BEGIN: Pattern Passive Mirroring Hint */}
        {patternEligible && (
          <section className="w-full mb-6">
            {!mirrorOpen ? (
              <button
                onClick={() => void handleOpenMirror()}
                disabled={mirrorLoading}
                className="w-full text-left py-2 px-3 rounded-xl bg-[#EAF2ED]/80 hover:bg-[#EAF2ED] text-[13px] font-medium text-[#387358] transition-colors duration-200 cursor-pointer disabled:opacity-50"
              >
                {mirrorLoading ? '正在比對原文…' : '這幾件事，好像在碰同一個地方。'}
              </button>
            ) : mirror && (
              <div className="bg-white rounded-[22px] p-5 shadow-sm border border-[#E9E6DE] transition-all">
                <div className="flex items-center justify-between text-[12px] text-[#7A8B82] mb-3">
                  <span className="font-medium text-[#387358]">跨時間原文並排</span>
                  <button onClick={() => setMirrorOpen(false)} className="text-[12px] text-[#86968E] hover:text-[#1E3E31] cursor-pointer">
                    收起
                  </button>
                </div>
                <div className="space-y-4">
                  {mirror.moments.map(m => (
                    <article key={m.id} className="border-l-2 border-[#387358]/40 pl-3">
                      <time className="font-mono text-[12px] text-[#86968E]">{formatDay(m.createdAt)} · {formatTime(m.createdAt)}</time>
                      <p className="mt-1 whitespace-pre-wrap text-[15px] text-[#1B2822] leading-relaxed">「{m.content}」</p>
                    </article>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}
        {/* END: Pattern Passive Mirroring Hint */}

        {/* BEGIN: FilterPills */}
        <nav aria-label="篩選分類" className="w-full flex items-center gap-2 overflow-x-auto no-scrollbar pb-2 mb-6" data-purpose="filter-pills">
          <button
            onClick={() => setActiveFilter('all')}
            className={`shrink-0 px-4 py-1.5 rounded-full text-[13px] font-medium transition-colors cursor-pointer ${
              activeFilter === 'all'
                ? 'bg-[#1E3E31] text-white shadow-sm'
                : 'bg-[#ECE9E2] hover:bg-[#E3DFD6] text-[#4A5D53]'
            }`}
          >
            全部留存 ({allCount})
          </button>
          <button
            onClick={() => setActiveFilter('expanded')}
            className={`shrink-0 px-3.5 py-1.5 rounded-full text-[13px] font-medium transition-colors cursor-pointer ${
              activeFilter === 'expanded'
                ? 'bg-[#1E3E31] text-white shadow-sm'
                : 'bg-[#ECE9E2] hover:bg-[#E3DFD6] text-[#4A5D53]'
            }`}
          >
            展開中 ({expandedIds.size})
          </button>
          <button
            onClick={() => setActiveFilter('settled')}
            className={`shrink-0 px-3.5 py-1.5 rounded-full text-[13px] font-medium transition-colors cursor-pointer ${
              activeFilter === 'settled'
                ? 'bg-[#1E3E31] text-white shadow-sm'
                : 'bg-[#ECE9E2] hover:bg-[#E3DFD6] text-[#4A5D53]'
            }`}
          >
            已安放 {settledCount > 0 ? `(${settledCount})` : ''}
          </button>
          <button
            onClick={() => setSortDesc(prev => !prev)}
            className="shrink-0 px-3.5 py-1.5 rounded-full bg-[#ECE9E2] hover:bg-[#E3DFD6] text-[#4A5D53] text-[13px] font-medium transition-colors inline-flex items-center gap-1 cursor-pointer"
          >
            <span>{sortDesc ? '新到舊' : '舊到新'}</span>
            <ArrowUpDown size={12} />
          </button>
        </nav>
        {/* END: FilterPills */}

        {/* BEGIN: TimelineRecords */}
        <main className="w-full flex flex-col space-y-7" data-purpose="timeline-list">
          {timelineGroups.length === 0 ? (
            <div className="w-full py-16 text-center text-sm text-[#84958C]">
              {activeFilter === 'settled' ? '目前沒有已安放的記錄。' : activeFilter === 'expanded' ? '目前沒有展開的記錄。' : '這裡還沒有留下任何事。'}
            </div>
          ) : (
            timelineGroups.map(group => {
              // Separate items into segments of consecutive collapsed vs expanded
              const segments: Array<{ isExpanded: boolean; items: FeedItem[] }> = [];
              for (const item of group.items) {
                const isExp = expandedIds.has(itemId(item));
                const last = segments[segments.length - 1];
                if (last && last.isExpanded === isExp && !isExp) {
                  last.items.push(item);
                } else {
                  segments.push({ isExpanded: isExp, items: [item] });
                }
              }

              return (
                <section key={group.key} className="timeline-group relative pl-7" data-purpose="date-group">
                  {/* Date Marker Node */}
                  <div className="timeline-dot absolute left-0 top-1 flex items-center justify-center">
                    <div className="w-3.5 h-3.5 rounded-full bg-[#418566] ring-4 ring-[#E2ECE6]" />
                  </div>
                  <div className="flex items-baseline gap-2 mb-3">
                    <h2 className="text-[17px] font-bold text-[#1F2C24]">{group.day}</h2>
                    <span className="text-[12px] font-medium text-[#84958C]">{group.weekday}</span>
                  </div>

                  <div className="space-y-3">
                    {segments.map((seg, sIdx) => {
                      if (!seg.isExpanded) {
                        // Grouped collapsed card
                        return (
                          <div
                            key={`collapsed-group-${sIdx}`}
                            className="bg-white rounded-[22px] shadow-sm border border-[#EBE8E0] divide-y divide-[#F4F2ED] overflow-hidden"
                          >
                            {seg.items.map(item => {
                              const id = itemId(item);
                              const content = item.kind === 'session' ? item.primaryMoment.content : item.moment.content;
                              return (
                                <article
                                  key={id}
                                  onClick={() => toggleExpand(id)}
                                  className="p-4 hover:bg-[#FAFAF8] transition-colors cursor-pointer group"
                                >
                                  <div className="flex items-center justify-between text-[12px] mb-1.5">
                                    <time className="font-mono text-[#86968E] font-medium">{formatTime(item.ts)}</time>
                                    <span className="text-[#A2ADA7] group-hover:text-[#4A5D53] transition-colors">
                                      <ChevronRight size={15} />
                                    </span>
                                  </div>
                                  <p className="text-[15.5px] text-[#223129] leading-snug group-hover:text-[#13261E]">
                                    {preview(content)}
                                  </p>
                                </article>
                              );
                            })}
                          </div>
                        );
                      }

                      // Expanded Card
                      const item = seg.items[0];
                      const id = itemId(item);
                      const isConfirming = confirmingId === id;
                      const hasClosure = item.kind === 'session' && Boolean(item.session.closure);
                      const content = item.kind === 'session' ? item.primaryMoment.content : item.moment.content;
                      const takeaway = item.kind === 'session' ? item.session.closure?.takeaway : undefined;
                      const unresolved = item.kind === 'session' ? item.session.closure?.unresolved : undefined;
                      const inPattern = patternMomentIds.has(item.kind === 'session' ? item.primaryMoment.id : item.moment.id);

                      return (
                        <div key={id} className="bg-white rounded-[22px] p-5 shadow-sm border border-[#E9E6DE] transition-all">
                          <div className="flex items-center justify-between text-[12px] text-[#7A8B82] mb-3">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[#62756B] font-medium">{formatTime(item.ts)}</span>
                              <span className="px-2 py-0.5 rounded-md bg-[#F0EEEA] text-[#697A70] text-[11px] font-medium">
                                {hasClosure ? '今天先收在這裡' : '還停在這裡'}
                              </span>
                            </div>
                            <button
                              onClick={() => toggleExpand(id)}
                              className="text-[12px] text-[#86968E] flex items-center gap-1 hover:text-[#1E3E31] cursor-pointer"
                            >
                              <MessageSquare size={13} />
                              <span>收起細節</span>
                            </button>
                          </div>

                          <p className="text-[16.5px] leading-relaxed text-[#1B2822] font-medium whitespace-pre-wrap">
                            {content}
                          </p>

                          {takeaway && (
                            <div className="mt-3.5 p-3.5 bg-[#F7F6F3] rounded-xl">
                              <p className="text-xs font-semibold text-[#387358]">這次先帶走</p>
                              <p className="mt-1 text-[14.5px] text-[#223129] leading-relaxed">{takeaway}</p>
                              {unresolved && (
                                <p className="mt-2 text-xs text-[#7A8B82] border-l-2 border-[#387358]/30 pl-2">{unresolved}</p>
                              )}
                            </div>
                          )}

                          {/* Interactive Action Buttons */}
                          <div className="mt-5 pt-3.5 border-t border-[#F2F0EC] flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {item.kind === 'session' && (
                                <button
                                  onClick={() => void onOpenSession(item.session.id)}
                                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#1E3E31] hover:bg-[#162F25] text-white text-[13px] font-medium transition-all shadow-sm cursor-pointer"
                                >
                                  <span>繼續這裡</span>
                                  <ArrowRight size={13} />
                                </button>
                              )}
                              <button
                                onClick={() => item.settled ? void handleUnsettle(item.kind, id) : void handleSettle(item.kind, id)}
                                className="px-3 py-1.5 rounded-full bg-[#F3F1EC] hover:bg-[#EAE6DE] text-[#4A5C52] text-[13px] font-medium transition-colors cursor-pointer"
                              >
                                {item.settled ? '取消安放' : '安放'}
                              </button>
                            </div>
                            <button
                              onClick={() => setConfirmingId(id)}
                              className="text-[12px] text-[#A2ADA7] hover:text-[#C55050] transition-colors px-2 py-1 cursor-pointer"
                            >
                              刪除
                            </button>
                          </div>

                          {/* Delete Confirmation Warning */}
                          {isConfirming && (
                            <div className="mt-3.5 pt-3.5 border-t border-red-100 bg-red-50/50 p-3.5 rounded-xl">
                              <p className="text-xs text-red-700 leading-relaxed">
                                {inPattern
                                  ? '這筆記錄目前是跨時間比對的一部分，刪除後那組連結會消失。確定刪除？'
                                  : '刪除後這筆記錄會從所有地方消失（備份檔仍保留）。確定刪除？'}
                              </p>
                              <div className="mt-2.5 flex items-center gap-4">
                                <button
                                  onClick={() => void handleDelete(item.kind, id)}
                                  className="text-xs font-semibold text-red-600 hover:text-red-800 cursor-pointer"
                                >
                                  確定刪除
                                </button>
                                <button
                                  onClick={() => setConfirmingId(null)}
                                  className="text-xs text-[#7A8B82] hover:text-[#1E2923] cursor-pointer"
                                >
                                  取消
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })
          )}
        </main>
        {/* END: TimelineRecords */}

        {/* BEGIN: FooterSafetyNotice */}
        <footer className="mt-12 flex flex-col items-center gap-3.5 text-center" data-purpose="page-footer">
          <p className="text-[12px] text-[#93A29A] tracking-normal font-normal">
            所有的文字只儲存在本地裝置，溫柔守候你的步調
          </p>
        </footer>
        {/* END: FooterSafetyNotice */}
      </div>
    </div>
  );
};
