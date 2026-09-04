import React from 'react';
import { ArrowLeft, Lock, Waves } from 'lucide-react';
import { HarborSession, SessionClosure } from '../types';
import { triggerHaptic } from '../utils/haptics';
import { UI_TEXT } from '../config/textConfig';

interface Props {
  session: HarborSession | null;
  closure: SessionClosure | null;
  onReturnToChat: () => void;
  onSaveAndReturn: (sessionId: string, closure: SessionClosure) => Promise<void>;
}

/** LAND is separate from CHAT: the draft is visible before the person keeps it. */
export const LandingScreen: React.FC<Props> = ({ session, closure, onReturnToChat, onSaveAndReturn }) => {
  if (!session || !closure) return null;

  const t = UI_TEXT.landing;

  const handleSave = async () => {
    triggerHaptic('docking');
    await onSaveAndReturn(session.id, closure);
  };

  return <div className="w-full max-w-[560px] min-h-[calc(100vh-104px)] py-5 sm:py-8">
    <header className="flex min-h-11 items-center"><button onClick={onReturnToChat} className="inline-flex items-center gap-1.5 text-sm text-ink-secondary hover:text-ink"><ArrowLeft size={16}/>{t.backBtn}</button></header>
    <main className="pt-10 sm:pt-14">
      <div className="flex items-center gap-2 text-sm font-medium text-accent"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/10"><Waves size={15}/></span>{t.tag}</div>
      <h1 className="mt-5 text-[32px] font-medium tracking-[-0.05em] text-ink sm:text-[40px]">{t.title}</h1>
      <p className="mt-3 max-w-md text-[16px] leading-relaxed text-ink-secondary">{t.subtitle}</p>

      <section className="mt-10 rounded-[30px] border border-border-base bg-surface p-6 shadow-[0_10px_28px_rgba(47,70,54,0.08)]">
        <div className="flex items-center justify-between pb-3 border-b border-border-light text-xs font-mono text-ink-muted">
          <span className="flex items-center gap-1.5 font-bold tracking-wider text-ink">
            <Lock className="w-3.5 h-3.5 text-primary" />
            {t.receiptTitle}
          </span>
          <span className="tracking-widest">{t.receiptSub}</span>
        </div>
        <div className="mt-4 rounded-2xl bg-surface-subtle px-4 py-4">
          <p className="flex items-center gap-1.5 text-xs font-medium text-accent"><Waves size={14}/>{t.takeawayHeader}</p>
          <p className="mt-2 text-[17px] leading-[1.8] text-ink">{closure.takeaway}</p>
        </div>
        <div className="mt-5 border-l-2 border-accent/45 pl-4">
          <p className="text-xs font-medium text-accent">{t.unresolvedHeader}</p>
          <p className="mt-2 text-[16px] leading-[1.75] text-ink-secondary">{closure.unresolved}</p>
          {closure.resumeAnchor && <p className="mt-3.5 border-t border-border-base/70 pt-2.5 text-xs text-ink-muted leading-relaxed">{t.resumeAnchorPrefix}{closure.resumeAnchor}{t.resumeAnchorSuffix}</p>}
        </div>
      </section>

      <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2">
        <button onClick={() => void handleSave()} className="inline-flex min-h-12 items-center gap-2 rounded-full bg-accent px-6 text-sm font-medium text-white shadow-[0_6px_14px_rgba(47,91,71,0.2)] hover:bg-accent-hover transition-colors">
          <Lock size={15}/>{t.saveBtn}
        </button>
        <button onClick={onReturnToChat} className="inline-flex min-h-11 text-sm text-ink-secondary hover:text-ink">
          {t.backBtn}
        </button>
      </div>
      <p className="mt-5 text-xs leading-relaxed text-ink-muted">{t.persistNote}</p>
    </main>
  </div>;
};
