import React, { useEffect, useState } from 'react';
import { ArrowLeft, Link2, Sparkles } from 'lucide-react';
import { MemoryReading } from '../domain/harbor';

interface Props {
  getInsight: () => Promise<MemoryReading | null>;
  onClose: () => void;
  onKeepLine: (momentIds: string[]) => Promise<void>;
}

export const DiscoveryScreen: React.FC<Props> = ({ getInsight, onClose, onKeepLine }) => {
  const [loading, setLoading] = useState(true);
  const [insight, setInsight] = useState<MemoryReading | null>(null);

  useEffect(() => {
    let alive = true;
    void getInsight().then(reading => {
      if (!alive) return;
      setInsight(reading);
      setLoading(false);
    });
    return () => { alive = false; };
  }, [getInsight]);

  return <div className="w-full max-w-[560px] min-h-[calc(100vh-104px)] py-5 sm:py-8">
    <header className="flex min-h-11 items-center"><button onClick={onClose} className="inline-flex items-center gap-1.5 text-sm text-ink-secondary hover:text-ink"><ArrowLeft size={16}/>回到現在</button></header>
    <main className="pt-12 sm:pt-16">
      <div className="flex items-center gap-2 text-sm font-medium text-accent"><Sparkles size={16}/>幫我找找看</div>
      <h1 className="mt-5 text-[30px] sm:text-[36px] font-medium tracking-[-0.045em] text-ink">最近留下的事，<br/>有沒有新的角度？</h1>
      <p className="mt-3 max-w-md text-[15px] leading-relaxed text-ink-secondary">只從跨時間留下的原文裡找一個可驗證的地方。</p>

      {loading ? <div className="mt-14 rounded-3xl border border-border-base bg-surface-subtle p-6"><p className="text-[16px] leading-relaxed text-ink-secondary">正在從近期記錄裡找一段值得回看的地方…</p><p className="mt-3 text-xs leading-relaxed text-ink-muted">只在你主動點選後進行。</p></div> : insight ? <section className="mt-12 rounded-[28px] border border-border-base bg-surface p-6 shadow-[0_5px_16px_rgba(47,70,54,0.08)]"><div><p className="text-sm font-medium text-accent">留下的軌跡</p><div className="mt-4 space-y-3 border-l border-accent/30 pl-4">{insight.evidence.map((item, index) => <p key={`${item.date}-${index}`} className="text-sm leading-relaxed text-ink-secondary"><span className="text-xs text-ink-muted">{item.date}</span><br/>「{item.phrase}」</p>)}</div></div><div className="mt-6 border-t border-border-base pt-5"><p className="text-sm font-medium text-accent">看得見的變化</p><p className="mt-3 text-[18px] leading-[1.85] text-ink">{insight.angle}</p></div><div className="mt-6 border-l-2 border-accent/35 pl-4"><p className="text-sm font-medium text-accent">還可再看的地方</p><p className="mt-2 text-[16px] leading-[1.75] text-ink-secondary">{insight.unresolved}</p></div><div className="mt-6 flex flex-wrap gap-x-5 gap-y-2"><button onClick={() => void onKeepLine(insight.momentIds)} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-accent px-5 text-sm font-medium text-white"><Link2 size={15}/>把這幾段連起來</button><button onClick={onClose} className="min-h-11 text-sm text-ink-secondary hover:text-ink">先收起</button></div></section> : <section className="mt-10 max-w-md border-l-2 border-border-base pl-5"><p className="text-[17px] leading-relaxed text-ink">這次沒有把片段硬湊成一條線。</p><p className="mt-2 text-sm leading-relaxed text-ink-secondary">先回到現在；有新的片段時，仍可以再來找找看。</p><button onClick={onClose} className="mt-5 text-sm font-medium text-accent">回到現在</button></section>}
    </main>
  </div>;
};
