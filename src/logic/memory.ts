import { DialogueEntry, ThoughtThread } from '../types';

export interface MemoryMatch { entry: DialogueEntry; score: number; }

const terms = (text: string) => {
  const cjk = text.replace(/[^\u4e00-\u9fff]/g, '');
  const pairs = Array.from({ length: Math.max(0, cjk.length - 1) }, (_, index) => cjk.slice(index, index + 2));
  const latin = text.toLowerCase().match(/[a-z0-9]{2,}/g) || [];
  return new Set([...pairs, ...latin]);
};

/** A deliberately small retrieval layer: it retrieves evidence, it does not infer a diagnosis. */
export const findRelatedMoments = (current: string, threads: ThoughtThread[], excludeId?: string, dismissedIds: string[] = []): MemoryMatch[] => {
  const currentTerms = terms(current);
  if (currentTerms.size === 0) return [];
  return threads.flatMap(thread => thread.entries)
    .filter(entry => entry.id !== excludeId && !dismissedIds.includes(entry.id))
    .map(entry => ({ entry, score: [...terms(entry.content)].filter(term => currentTerms.has(term)).length }))
    .filter(match => match.score > 0)
    .sort((a, b) => b.score - a.score || b.entry.createdAt - a.entry.createdAt)
    .slice(0, 3);
};
