import React from 'react';
import { ArrowLeft, Check, Waves } from 'lucide-react';
import { HarborSession, SessionClosure } from '../types';

interface Props {
  session: HarborSession | null;
  closure: SessionClosure | null;
  onReturnToChat: () => void;
  onSaveAndReturn: (sessionId: string, closure: SessionClosure) => Promise<void>;
}

/** LAND is separate from CHAT: the draft is visible before the person keeps it. */
export const LandingScreen: React.FC<Props> = ({ session, closure, onReturnToChat, onSaveAndReturn }) => {
  if (!session || !closure) return null;
  return <div className="w-full max-w-[560px] min-h-[calc(100vh-104px)] py-5 sm:py-8">
    <header className="flex min-h-11 items-center"><button onClick={onReturnToChat} className="inline-flex items-center gap-1.5 text-sm text-ink-secondary hover:text-ink"><ArrowLeft size={16}/>還想說一點</button></header>
    <main className="pt-10 sm:pt-14">
      <div className="flex items-center gap-2 text-sm font-medium text-accent"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/10"><Check size={15}/></span>暫時停在這裡</div>
      <h1 className="mt-5 text-[32px] font-medium tracking-[-0.05em] text-ink sm:text-[40px]">今天先收在這裡。</h1>
      <p className="mt-3 max-w-md text-[16px] leading-relaxed text-ink-secondary">這不是結論；只是把剛才碰到的地方，好好留在這裡。</p>

      <section className="mt-12 rounded-[30px] border border-border-base bg-surface p-6 shadow-[0_10px_28px_rgba(47,70,54,0.08)]">
        <div className="rounded-2xl bg-surface-subtle px-4 py-4"><p className="flex items-center gap-1.5 text-xs font-medium text-accent"><Waves size={14}/>這次先帶走</p><p className="mt-3 text-[18px] leading-[1.8] text-ink">{closure.takeaway}</p></div>
        <div className="mt-6 border-l-2 border-accent/45 pl-4"><p className="text-xs font-medium text-accent">還可以先放著</p><p className="mt-2 text-[16px] leading-[1.75] text-ink-secondary">{closure.unresolved}</p>{closure.resumeAnchor && <p className="mt-4 text-sm leading-relaxed text-ink-muted">下次若想回來，可以從「{closure.resumeAnchor}」接著說。</p>}</div>
      </section>

      <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2"><button onClick={() => void onSaveAndReturn(session.id, closure)} className="inline-flex min-h-12 items-center gap-2 rounded-full bg-accent px-6 text-sm font-medium text-white shadow-[0_6px_14px_rgba(47,91,71,0.2)]"><Check size={16}/>回到現在</button><button onClick={onReturnToChat} className="inline-flex min-h-11 text-sm text-ink-secondary hover:text-ink">還想再說一點</button></div>
      <p className="mt-6 text-xs leading-relaxed text-ink-muted">選擇回到現在後，這份暫時收束才會和本次對話一起保存。</p>
    </main>
  </div>;
};
