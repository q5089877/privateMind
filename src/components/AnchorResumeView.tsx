import { useState } from 'react';
import type { FC } from 'react';
import { IcebergLayerRecord, IcebergLayerType } from '../domain/IcebergDomain';

const LAYER_LABELS: Record<IcebergLayerType, string> = {
  event: '事件',
  feeling: '感受',
  meaning: '意義',
  expectation: '期待',
  yearning: '渴望',
};

interface AnchorResumeViewProps {
  targetRecord: IcebergLayerRecord;
  historyLayers: IcebergLayerRecord[];
  sessionTurns: Array<{ role: 'user' | 'assistant'; content: string; createdAt?: number }>;
  canAdvance: boolean;
  onAdvance: () => void;
  onStartNewSession: () => void;
}

export const AnchorResumeView: FC<AnchorResumeViewProps> = ({
  targetRecord,
  historyLayers,
  sessionTurns,
  canAdvance,
  onAdvance,
  onStartNewSession,
}) => {
  const [showHistory, setShowHistory] = useState(false);
  const timestamp = targetRecord.confirmedAt ?? targetRecord.updatedAt;
  const dateText = new Date(timestamp).toLocaleString('zh-TW', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <section className="mx-auto w-full max-w-xl space-y-4">
      <article className="rounded-2xl border border-border-base bg-surface p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border-base/60 pb-3">
          <p className="text-xs font-medium text-accent">已停靠於：{LAYER_LABELS[targetRecord.layer]}</p>
          <time className="text-xs text-ink-muted">{dateText} 留下</time>
        </div>
        <div className="mt-4 rounded-xl bg-surface-subtle p-3.5">
          <p className="mb-1 text-xs font-medium text-ink-muted">當時留下的文字</p>
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-ink">{targetRecord.rawText}</p>
        </div>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-border-base/60 pt-3">
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => setShowHistory(value => !value)} className="min-h-[44px] rounded-full border border-border-base px-3 text-xs text-ink-secondary cursor-pointer">
              {showHistory ? '收起歷史' : '再看一眼'}
            </button>
            <button type="button" onClick={onStartNewSession} className="min-h-[44px] px-2 text-xs text-ink-muted cursor-pointer">
              重新開始一段
            </button>
          </div>
          {canAdvance && (
            <button type="button" onClick={onAdvance} className="min-h-[44px] rounded-full bg-accent px-4 text-xs font-medium text-white cursor-pointer">
              從這裡往下一層
            </button>
          )}
        </div>
      </article>

      {showHistory && (
        <div className="space-y-3">
          {historyLayers.filter(layer => layer.layer !== targetRecord.layer).map(layer => (
            <article key={layer.id} className="rounded-xl border border-border-base bg-surface p-3.5">
              <p className="text-xs font-medium text-accent">{LAYER_LABELS[layer.layer]}</p>
              <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-ink">{layer.rawText}</p>
            </article>
          ))}
          {sessionTurns.length > 0 && (
            <article className="rounded-xl border border-border-base/70 bg-surface-subtle p-3.5">
              <p className="text-xs font-medium text-ink-muted">對話紀錄</p>
              <div className="mt-2 space-y-2">
                {sessionTurns.map((turn, index) => (
                  <p key={`${turn.createdAt ?? 'turn'}-${index}`} className="whitespace-pre-wrap text-xs leading-relaxed text-ink-secondary">
                    <span className="font-medium text-ink-muted">{turn.role === 'user' ? '你：' : 'AI：'}</span>{turn.content}
                  </p>
                ))}
              </div>
            </article>
          )}
        </div>
      )}
    </section>
  );
};
