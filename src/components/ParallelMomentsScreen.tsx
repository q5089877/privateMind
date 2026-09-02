import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Link2, Sparkles } from 'lucide-react';
import { ActiveCollection, Moment } from '../types';
import { hasInsightEligibility } from '../logic/connectionCandidates';
import { GeminiProxyClient, TimelineInsight } from '../logic/geminiProxyClient';

interface Props {
  collection: ActiveCollection | null;
  getMoments: () => Promise<Moment[]>;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  onDecide: (decision: 'dismissed' | 'deferred') => Promise<void>;
}

const stamp = (value: number) => new Intl.DateTimeFormat('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(value));

export const ParallelMomentsScreen: React.FC<Props> = ({ collection, getMoments, onClose, onConfirm, onDecide }) => {
  const [all, setAll] = useState<Moment[]>([]);
  const [working, setWorking] = useState(false);
  const [insight, setInsight] = useState<TimelineInsight | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  useEffect(() => { void getMoments().then(setAll); }, [getMoments]);
  const moments = useMemo(() => collection ? collection.momentIds.map(id => all.find(moment => moment.id === id)).filter((moment): moment is Moment => Boolean(moment)).sort((a, b) => a.createdAt - b.createdAt) : [], [all, collection]);
  const isCandidate = collection?.kind === 'candidate';
  const eligible = hasInsightEligibility(moments);

  const confirm = async () => { setWorking(true); await onConfirm(); setWorking(false); };
  const askInsight = async () => {
    if (!eligible || analyzing) return;
    setAnalyzing(true);
    setInsight(await GeminiProxyClient.getTimelineInsight(moments.map(moment => ({ date: stamp(moment.createdAt), content: moment.content }))));
    setAnalyzing(false);
  };

  return <div className="w-full max-w-[560px] min-h-[calc(100vh-104px)] py-5 sm:py-8">
    <header className="flex min-h-11 items-center"><button onClick={onClose} className="inline-flex items-center gap-1.5 text-sm text-ink-secondary hover:text-ink"><ArrowLeft size={16}/>回到時間流</button></header>
    <main className="pt-12 sm:pt-16">
      <div className="flex items-center gap-2 text-sm font-medium text-accent"><Link2 size={16}/>{isCandidate ? '並排放著' : '已連在一起'}</div>
      <h1 className="mt-5 text-[30px] sm:text-[36px] font-medium tracking-[-0.045em] text-ink">這幾段放在一起看</h1>
      <p className="mt-3 max-w-md text-[15px] leading-relaxed text-ink-secondary">原文還留在各自的時間位置。這裡不替它們命名，也不替你解釋。</p>

      <div className="mt-10 space-y-3">
        {moments.map(moment => <article key={moment.id} className="rounded-3xl border border-border-base bg-surface p-5 shadow-[0_3px_10px_rgba(47,70,54,0.06)]"><time className="text-xs text-ink-muted">{stamp(moment.createdAt)}</time><p className="mt-3 text-[18px] leading-[1.7] text-ink whitespace-pre-wrap">{moment.content}</p></article>)}
      </div>

      {isCandidate ? <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2"><button disabled={working} onClick={() => void confirm()} className="inline-flex min-h-11 items-center rounded-full bg-accent px-5 text-sm font-medium text-white disabled:opacity-50">連在一起</button><button disabled={working} onClick={() => void onDecide('dismissed')} className="min-h-11 text-sm text-ink-secondary hover:text-ink">各自獨立</button><button disabled={working} onClick={() => void onDecide('deferred')} className="min-h-11 text-sm text-ink-secondary hover:text-ink">先放著</button></div> : <div className="mt-8 rounded-2xl border border-border-base bg-surface-subtle p-4"><div className="flex items-center gap-2 text-sm font-medium text-accent"><Sparkles size={15}/>回看資格</div><p className="mt-2 text-sm leading-relaxed text-ink-secondary">{eligible ? '這條線已跨過時間，也累積了足夠原文。你可以選擇要不要從中找一個新角度。' : '這些片段先留在這裡。時間與內容再多一些，才值得產生跨時間洞見。'}</p>{eligible && !insight && <button disabled={analyzing} onClick={() => void askInsight()} className="mt-4 inline-flex min-h-10 items-center rounded-full border border-accent/25 bg-surface px-4 text-sm font-medium text-accent disabled:opacity-50">{analyzing ? '正在回看原文…' : '回看這條線'}</button>}{eligible && insight && <div className="mt-5 border-t border-border-base pt-5"><p className="text-sm font-medium text-ink">看得見的一個角度</p><p className="mt-3 text-[16px] leading-[1.8] text-ink-secondary">{insight.angle}</p><div className="mt-4 space-y-2 border-l border-accent/30 pl-3">{insight.evidence.map((item, index) => <p key={`${item.date}-${index}`} className="text-xs leading-relaxed text-ink-muted">{item.date}　「{item.phrase}」</p>)}</div><p className="mt-5 text-[15px] leading-relaxed text-ink">{insight.question}</p></div>}</div>}
    </main>
  </div>;
};
