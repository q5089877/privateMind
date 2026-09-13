import React from 'react';
import type { CoreAnswer } from '../services/ai/roles/coreAnswerRole';

interface Props { answer: CoreAnswer | null; loading: boolean; failed?: boolean; onRequest?: () => void; showRetry?: boolean; retryLabel?: string; }

export const CoreAnswerCard: React.FC<Props> = ({ answer, loading, failed = false, onRequest, showRetry = true, retryLabel = '再看一個核心問題' }) => {

  return <section className="mt-4 rounded-2xl border border-accent/25 bg-surface-subtle p-4" aria-label="核心問題回答">
    {!answer && !loading && onRequest ? (
      <button type="button" onClick={onRequest} className="min-h-[44px] rounded-full border border-accent/35 px-4 text-sm font-medium text-accent cursor-pointer">
        {retryLabel}
      </button>
    ) : (
      <>
        {answer && <p className="text-base font-medium text-ink">{answer.title}</p>}
        {loading && <p className="mt-2 text-sm leading-relaxed text-ink-secondary">正在整理這件事……</p>}
        {answer && <div className="mt-3 space-y-3 text-sm leading-relaxed text-ink-secondary">
          <blockquote className="border-l-2 border-accent/50 pl-3 text-base leading-relaxed text-ink">「{answer.quote}」</blockquote>
          <div><span className="block text-xs font-medium text-ink-muted">完整解說</span><p className="mt-1 whitespace-pre-wrap text-ink">{answer.answer}</p></div>
          <div className="rounded-xl bg-surface px-3 py-2"><span className="block text-xs font-medium text-ink-muted">白話說明</span><p className="mt-1 whitespace-pre-wrap">{answer.plainLanguage}</p></div>
          <p className="text-ink">{answer.reflectionQuestion}</p>
          <p className="text-xs text-ink-muted">依據原文：「{answer.evidence}」</p>
        </div>}
        {!loading && showRetry && onRequest && (answer || failed) && <button type="button" onClick={onRequest} className="mt-3 min-h-[44px] rounded-full border border-border-base px-4 text-xs text-ink-secondary cursor-pointer">{retryLabel}</button>}
      </>
    )}
  </section>;
};
