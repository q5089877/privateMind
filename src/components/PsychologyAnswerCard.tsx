import React from 'react';
import type { PsychologyAnswer } from '../services/ai/roles/psychologyAnswerRole';
import { SpeechControls } from './SpeechControls';

interface Props { answer: PsychologyAnswer | null; loading: boolean; failed: boolean; onRetry: () => void; }

const sectionsFor = (answer: PsychologyAnswer) => {
  switch (answer.lens) {
    case 'teen': return [
      ['目前的發展任務', answer.developmentalTask],
      ['發展脈絡', answer.developmentContext],
      ['可能沒說出口的需要', answer.possibleNeed],
      ['目前還不能確定', answer.whatIsStillUnknown],
      ['先避免這樣說', answer.phraseToAvoid],
      ['可以這樣回應', answer.lowPressureReply],
      ['低壓連結', answer.lowPressureBridge],
    ] as const;
    case 'adler': return [
      ['我的課題', answer.myTask],
      ['對方的課題', answer.otherTask],
      ['這個反應可能想保護什麼', answer.possiblePurpose],
      ['界線行動', answer.boundaryAction],
    ] as const;
    case 'cbt': return [
      ['情境觸發點', answer.trigger],
      ['自動化思考', answer.automaticThought],
      ['可能的思考偏誤', answer.distortionType],
      ['支持證據', answer.evidenceFor],
      ['反向證據', answer.evidenceAgainst],
      ['較平衡的想法', answer.balancedThought],
      ['小型實驗', answer.smallExperiment],
    ] as const;
  }
};

export const PsychologyAnswerCard: React.FC<Props> = ({ answer, loading, failed, onRetry }) => <section className="mt-4 rounded-2xl border border-accent/25 bg-surface-subtle p-4" aria-label="心理學視角回答">
  {loading && <p className="text-sm leading-relaxed text-ink-secondary">正在整理這個角度……</p>}
  {!loading && failed && <button type="button" onClick={onRetry} className="min-h-[44px] rounded-full border border-accent/35 px-4 text-sm font-medium text-accent cursor-pointer">重試這個角度</button>}
  {answer && <div className="space-y-4">
    <p className="text-base font-medium text-ink">{answer.title}</p>
    <div className="space-y-3">
      {sectionsFor(answer).map(([label, content]) => <section key={label} className="rounded-xl bg-surface px-3 py-3">
        <h2 className="text-xs font-medium text-ink-muted">{label}</h2>
        <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-ink">{content}</p>
      </section>)}
    </div>
    <p className="text-sm leading-relaxed text-ink">{answer.reflectionQuestion}</p>
    <p className="text-xs text-ink-muted">依據原文：「{answer.evidence}」</p>
    <SpeechControls text={[answer.title, ...sectionsFor(answer).flatMap(([label, content]) => [label, content]), answer.reflectionQuestion].join('。')} />
  </div>}
</section>;
