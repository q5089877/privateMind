import { Moment, ReviewReading, TimelineInsight } from '../../domain/harbor';
import { hasInsightEligibility } from '../../logic/reviewEligibility';
import { GeminiProxyClient } from '../../logic/geminiProxyClient';

const stamp = (value: number) => new Intl.DateTimeFormat('zh-TW', {
  month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false
}).format(new Date(value));

/**
 * History is read only after a person explicitly asks to review it. There are
 * no stored candidate groups or user-managed connections in this service.
 */
export class MemoryService {
  public canReviewAcrossTime(moments: Moment[]): boolean {
    return hasInsightEligibility(moments);
  }

  /** Find evidence and produce one cited reading inside the same explicit review action. */
  public async readRecentTimeline(moments: Moment[]): Promise<ReviewReading | null> {
    const recent = [...moments].sort((a, b) => a.createdAt - b.createdAt).slice(-60);
    if (!hasInsightEligibility(recent)) return null;

    const indexed = recent.map((moment, index) => ({
      id: `M${index + 1}`,
      sourceId: moment.id,
      createdAt: moment.createdAt,
      date: stamp(moment.createdAt),
      content: moment.content
    }));
    const candidateIds = await GeminiProxyClient.findRelevantMoments(indexed);
    const selected = candidateIds ? indexed.filter(item => candidateIds.includes(item.id)) : [];
    if (!hasInsightEligibility(selected)) return null;

    const insight: TimelineInsight | null = await GeminiProxyClient.getTimelineInsight(
      selected.map(item => ({ date: item.date, content: item.content }))
    );
    return insight ? { ...insight, momentIds: selected.map(item => item.sourceId) } : null;
  }
}
