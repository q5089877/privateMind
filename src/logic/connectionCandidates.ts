import { LinkCandidate, LinkDecision, Moment } from '../types';

const DAY = 24 * 60 * 60 * 1000;

const terms = (text: string) => {
  const cjk = text.replace(/[^\u4e00-\u9fff]/g, '');
  const pairs = Array.from({ length: Math.max(0, cjk.length - 1) }, (_, index) => cjk.slice(index, index + 2));
  const latin = text.toLowerCase().match(/[a-z0-9]{2,}/g) || [];
  return new Set([...pairs, ...latin]);
};

export const fingerprint = (momentIds: string[]) => [...new Set(momentIds)].sort().join(':');

export const hasInsightEligibility = (moments: Moment[]) => {
  if (moments.length < 3) return false;
  const dates = new Set(moments.map(moment => new Date(moment.createdAt).toDateString()));
  const span = Math.max(...moments.map(moment => moment.createdAt)) - Math.min(...moments.map(moment => moment.createdAt));
  return dates.size >= 2 && span >= DAY;
};

/** Conservative, entirely local matching. A connection is only a candidate until the person confirms it. */
export const findCandidate = (moments: Moment[], decisions: LinkDecision[]): LinkCandidate | null => {
  const dismissed = new Set(decisions.map(decision => decision.fingerprint));
  const ordered = [...moments].sort((a, b) => b.createdAt - a.createdAt);
  let best: LinkCandidate | null = null;

  for (let index = 0; index < ordered.length; index += 1) {
    const current = ordered[index];
    const currentTerms = terms(current.content);
    if (currentTerms.size < 2) continue;
    for (let olderIndex = index + 1; olderIndex < ordered.length; olderIndex += 1) {
      const older = ordered[olderIndex];
      if (Math.abs(current.createdAt - older.createdAt) < DAY * 2) continue;
      const overlap = [...currentTerms].filter(term => terms(older.content).has(term)).length;
      if (overlap < 2) continue;
      const momentIds = [older.id, current.id];
      const candidateFingerprint = fingerprint(momentIds);
      if (dismissed.has(candidateFingerprint)) continue;
      if (!best || overlap > best.score) best = { id: `candidate-${candidateFingerprint}`, momentIds, score: overlap, createdAt: Date.now() };
    }
  }
  return best;
};
