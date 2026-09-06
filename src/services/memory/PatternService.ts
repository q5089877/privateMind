import type { Moment } from '../../domain/harbor';
import { patternEligibility } from '../../logic/patternEligibility';
import { GeminiProxyClient } from '../../logic/geminiProxyClient';

const stamp = (value: number) =>
    new Intl.DateTimeFormat('zh-TW', {
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    }).format(new Date(value));

export interface PatternMirror {
    /** The 3-4 original Moment objects to display. Never AI-generated text. */
    moments: Pick<Moment, 'id' | 'content' | 'createdAt'>[];
}

/**
 * Pattern Passive Mirroring Service.
 *
 * Flow:
 *   1. patternEligibility (deterministic gates) → null  →  no signal
 *   2. patternEligibility → Moment pool
 *   3. GeminiProxyClient.findRelevantMoments (literal-anchor select) → IDs
 *   4. Return only original Moment text + timestamps. Zero AI output to user.
 *
 * The old MemoryService.readRecentTimeline / timelineRole path is replaced
 * entirely. AI writes nothing the user will ever read.
 */
export class PatternService {
    public canMirror(moments: Moment[]): boolean {
        return patternEligibility(moments.filter(m => !m.deletedAt)) !== null;
    }

    public async findMirror(moments: Moment[]): Promise<PatternMirror | null> {
        const pool = patternEligibility(moments.filter(m => !m.deletedAt));
        if (!pool) return null;

        const indexed = pool.map((m, i) => ({
            id: `M${i + 1}`,
            sourceId: m.id,
            createdAt: m.createdAt,
            date: stamp(m.createdAt),
            content: m.content
        }));

        const selected = await GeminiProxyClient.findRelevantMoments(indexed);

        // Fallback: if AI finds nothing, show the 3 oldest-newest-middle anchors
        const ids = selected ?? [indexed[0].id, indexed[Math.floor(indexed.length / 2)].id, indexed.at(-1)!.id];

        const bySourceId = new Map(indexed.map(e => [e.id, e.sourceId]));
        const momentById = new Map(pool.map(m => [m.id, m]));

        const result = ids
            .map(id => {
                const sourceId = bySourceId.get(id);
                return sourceId ? momentById.get(sourceId) : undefined;
            })
            .filter((m): m is Moment => Boolean(m))
            .map(m => ({ id: m.id, content: m.content, createdAt: m.createdAt }));

        return result.length >= 3 ? { moments: result } : null;
    }
}
