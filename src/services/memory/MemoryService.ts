import { LinkCandidate, LinkDecision, MemoryReading, Moment, TimelineInsight } from '../../domain/harbor';
import { findCandidate, hasInsightEligibility } from '../../logic/connectionCandidates';
import { GeminiProxyClient } from '../../logic/geminiProxyClient';

const stamp = (value: number) => new Intl.DateTimeFormat('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(value));

/** Local, conservative memory screening. It discovers candidates but never confirms a relationship. */
export class MemoryService {
  public findQuietCandidate(moments: Moment[], decisions: LinkDecision[]): LinkCandidate | null {
    return findCandidate(moments, decisions);
  }

  public canReviewAcrossTime(moments: Moment[]): boolean {
    return hasInsightEligibility(moments);
  }

  /** Only called from a deliberate review action; it never runs after capture. */
  public async findEvidenceBackedReading(moments: Moment[]): Promise<MemoryReading | null> {
    const recent = [...moments].sort((a, b) => a.createdAt - b.createdAt).slice(-60);
    const indexed = recent.map((moment, index) => ({ id: `M${index + 1}`, sourceId: moment.id, createdAt: moment.createdAt, date: stamp(moment.createdAt), content: moment.content }));
    const candidateIds = await GeminiProxyClient.findRelevantMoments(indexed);
    const selected = candidateIds ? indexed.filter(item => candidateIds.includes(item.id)) : [];
    if (!hasInsightEligibility(selected)) return null;
    const insight = await GeminiProxyClient.getTimelineInsight(selected.map(item => ({ date: item.date, content: item.content })));
    return insight ? { ...insight, momentIds: selected.map(item => item.sourceId) } : null;
  }

  /** A confirmed or manually created line may be read without querying unrelated history. */
  public async readTimeline(moments: Moment[]): Promise<TimelineInsight | null> {
    if (!hasInsightEligibility(moments)) return null;
    const ordered = [...moments].sort((a, b) => a.createdAt - b.createdAt);
    return GeminiProxyClient.getTimelineInsight(ordered.map(moment => ({ date: stamp(moment.createdAt), content: moment.content })));
  }
}
