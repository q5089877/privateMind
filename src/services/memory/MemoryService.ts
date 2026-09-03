import { LinkCandidate, LinkDecision, Moment, TimelineInsight } from '../../domain/harbor';
import { findCandidate, fingerprint, hasInsightEligibility } from '../../logic/connectionCandidates';
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

  /**
   * An explicit search may ask the model to select original fragments only.
   * It deliberately returns no interpretation: the person sees the originals
   * and chooses whether they should become a ThreadLine first.
   */
  public async findExplicitCandidate(moments: Moment[], decisions: LinkDecision[]): Promise<LinkCandidate | null> {
    const recent = [...moments].sort((a, b) => a.createdAt - b.createdAt).slice(-60);
    const indexed = recent.map((moment, index) => ({ id: `M${index + 1}`, sourceId: moment.id, createdAt: moment.createdAt, date: stamp(moment.createdAt), content: moment.content }));
    const candidateIds = await GeminiProxyClient.findRelevantMoments(indexed);
    const selected = candidateIds ? indexed.filter(item => candidateIds.includes(item.id)) : [];
    if (!hasInsightEligibility(selected)) return findCandidate(moments, decisions);

    const momentIds = selected.map(item => item.sourceId);
    const key = fingerprint(momentIds);
    const rejected = decisions.some(decision => decision.fingerprint === key && decision.decision === 'dismissed');
    const deferred = decisions.some(decision => decision.fingerprint === key && decision.decision === 'deferred' && Date.now() - decision.decidedAt < 21 * 24 * 60 * 60 * 1000);
    if (rejected || deferred) return findCandidate(moments, decisions);
    return { id: `candidate-${key}`, momentIds, score: selected.length, createdAt: Date.now() };
  }

  /** A confirmed or manually created line may be read without querying unrelated history. */
  public async readTimeline(moments: Moment[]): Promise<TimelineInsight | null> {
    if (!hasInsightEligibility(moments)) return null;
    const ordered = [...moments].sort((a, b) => a.createdAt - b.createdAt);
    return GeminiProxyClient.getTimelineInsight(ordered.map(moment => ({ date: stamp(moment.createdAt), content: moment.content })));
  }
}
