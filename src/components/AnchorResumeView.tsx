import { useState } from 'react';
import type { FC } from 'react';
import { IcebergLayerRecord, IcebergLayerType, LAYER_ORDER } from '../domain/IcebergDomain';

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
  const layers = Array.from(new Map(
    [...historyLayers, targetRecord]
      .filter(layer => (layer.status === 'confirmed' || layer.status === 'anchored') && layer.rawText.trim())
      .map(layer => [layer.layer, layer] as const)
  ).values()).sort((a, b) => LAYER_ORDER.indexOf(a.layer) - LAYER_ORDER.indexOf(b.layer));

  return (
    <section className="mx-auto w-full max-w-xl space-y-4">
      <article className="rounded-2xl border border-border-base bg-surface shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border-base/60 px-5 py-4">
          <p className="text-xs font-medium text-accent">地質岩芯・已停靠於：{LAYER_LABELS[targetRecord.layer]}</p>
          <time className="text-xs text-ink-muted">{dateText} 留下</time>
        </div>

        <div className="divide-y divide-border-base/60">
          {layers.map(layer => (
            <div key={layer.id} className="flex gap-3 px-5 py-4">
              <span className="mt-1 h-4 w-1 shrink-0 rounded-full bg-accent/55" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-ink-muted">{LAYER_LABELS[layer.layer]}</p>
                <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-ink">{layer.rawText}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border-base/60 px-5 py-3">
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
