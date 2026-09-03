import React, { useEffect, useState } from 'react';
import { ArrowLeft, Link2, Sparkles } from 'lucide-react';
import { LinkCandidate } from '../domain/harbor';

interface Props {
  getCandidate: () => Promise<LinkCandidate | null>;
  onClose: () => void;
  onOpenCandidate: () => void;
}

export const DiscoveryScreen: React.FC<Props> = ({ getCandidate, onClose, onOpenCandidate }) => {
  const [loading, setLoading] = useState(true);
  const [candidate, setCandidate] = useState<LinkCandidate | null>(null);

  useEffect(() => {
    let alive = true;
    void getCandidate().then(nextCandidate => {
      if (!alive) return;
      setCandidate(nextCandidate);
      setLoading(false);
    });
    return () => { alive = false; };
  }, [getCandidate]);

  return <div className="w-full max-w-[560px] min-h-[calc(100vh-104px)] py-5 sm:py-8">
    <header className="flex min-h-11 items-center"><button onClick={onClose} className="inline-flex items-center gap-1.5 text-sm text-ink-secondary hover:text-ink"><ArrowLeft size={16}/>回到現在</button></header>
    <main className="pt-12 sm:pt-16">
      <div className="flex items-center gap-2 text-sm font-medium text-accent"><Sparkles size={16}/>幫我找找看</div>
      <h1 className="mt-5 text-[30px] sm:text-[36px] font-medium tracking-[-0.045em] text-ink">有沒有幾段話，<br/>值得並排看看？</h1>
      <p className="mt-3 max-w-md text-[15px] leading-relaxed text-ink-secondary">只找跨時間的原文；先不替它們命名、解釋或下結論。</p>

      {loading ? <div className="mt-14 rounded-3xl border border-border-base bg-surface-subtle p-6"><p className="text-[16px] leading-relaxed text-ink-secondary">正在從近期原文裡找幾段可以並排的話…</p><p className="mt-3 text-xs leading-relaxed text-ink-muted">只在你主動點選後進行；這一步不會產生洞見。</p></div> : candidate ? <section className="mt-12 rounded-[28px] border border-border-base bg-surface p-6 shadow-[0_5px_16px_rgba(47,70,54,0.08)]"><p className="text-sm font-medium text-accent">先找到 {candidate.momentIds.length} 段原文</p><p className="mt-3 text-[17px] leading-[1.8] text-ink-secondary">它們仍在各自的時間位置。下一步只會把原文並排，是否連成一條線仍由你決定。</p><div className="mt-6 flex flex-wrap gap-x-5 gap-y-2"><button onClick={onOpenCandidate} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-accent px-5 text-sm font-medium text-white"><Link2 size={15}/>把這幾段放在一起</button><button onClick={onClose} className="min-h-11 text-sm text-ink-secondary hover:text-ink">先收起</button></div></section> : <section className="mt-10 max-w-md border-l-2 border-border-base pl-5"><p className="text-[17px] leading-relaxed text-ink">這次沒有把片段硬湊成一條線。</p><p className="mt-2 text-sm leading-relaxed text-ink-secondary">先回到現在；有新的片段時，仍可以再來找找看。</p><button onClick={onClose} className="mt-5 text-sm font-medium text-accent">回到現在</button></section>}
    </main>
  </div>;
};
