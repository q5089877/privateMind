import React from 'react';
import type { CoreAnswer, CoreLens } from '../services/ai/roles/coreAnswerRole';

interface Props { answer: CoreAnswer | null; loading: boolean; onRequest?: () => void; showRetry?: boolean; retryLabel?: string; expectedLens?: CoreLens; }

export const CoreAnswerCard: React.FC<Props> = ({ answer, loading, onRequest, showRetry = true, retryLabel = '再看一個核心問題', expectedLens = 'diamond_sutra' }) => (
  <section className="mt-4 rounded-2xl border border-accent/25 bg-surface-subtle p-4" aria-label="核心問題回答">
    {!answer && !loading && onRequest ? (
      <button type="button" onClick={onRequest} className="min-h-[44px] rounded-full border border-accent/35 px-4 text-sm font-medium text-accent cursor-pointer">
        {retryLabel}
      </button>
    ) : (
      <>
        <p className="text-xs font-medium text-accent">{(answer?.lens || expectedLens) === 'i_ching' ? '易經視角' : '金剛經視角'}</p>
        {loading && <p className="mt-2 text-sm leading-relaxed text-ink-secondary">正在整理這件事……</p>}
        {answer && <div className="mt-3 space-y-3 text-sm leading-relaxed text-ink-secondary"><p className="whitespace-pre-wrap">{answer.answer}</p><div className="rounded-xl bg-surface px-3 py-2"><span className="block text-xs font-medium text-ink-muted">白話說明</span><p className="mt-1 whitespace-pre-wrap">{answer.plainLanguage}</p></div><p className="text-ink">{answer.reflectionQuestion}</p></div>}
        {!loading && showRetry && onRequest && <button type="button" onClick={onRequest} className="mt-3 min-h-[44px] rounded-full border border-border-base px-4 text-xs text-ink-secondary cursor-pointer">{retryLabel}</button>}
      </>
    )}
  </section>
);
