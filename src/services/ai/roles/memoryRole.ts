import { FAST_THINKING_CONFIG, FLASH_LITE_MODEL, GeminiRoleRequest, parseJson } from './shared';

export interface MemorySource {
  id: string;
  createdAt: number;
  date: string;
  content: string;
}

/** The retrieval role selects evidence only. It never writes an interpretation. */
export const memoryRole = {
  create(entries: MemorySource[]): GeminiRoleRequest | null {
    if (entries.length < 3) return null;
    const timeline = entries.map(item => `[${item.id}] ${item.date}｜${item.content}`).join('\n');
    return {
      timeoutMs: 8_000,
      context: undefined,
      payload: {
        model: FLASH_LITE_MODEL,
        contents: [{ role: 'user', parts: [{ text: `以下是使用者近期留下的原文：\n${timeline}\n\n請優先挑出一組最值得回看的 3 到 5 段原文 id。它們必須跨至少兩個自然日、第一筆與最後一筆至少相隔 24 小時，而且能從原文看見具體的重複、轉折、缺口或拉扯。只負責選 id：不要解釋、不要命名、不要下結論。只在完全沒有可驗證共同脈絡時回傳 {"momentIds":[]}。` }] }],
        generationConfig: {
          temperature: 0.1, maxOutputTokens: 96, responseMimeType: 'application/json',
          responseSchema: { type: 'OBJECT', properties: { momentIds: { type: 'ARRAY', maxItems: 5, items: { type: 'STRING' } } }, required: ['momentIds'] },
          thinkingConfig: FAST_THINKING_CONFIG
        }
      }
    };
  },

  read(raw: string, entries: MemorySource[]): string[] | null {
    const parsed = parseJson(raw) as { momentIds?: unknown } | null;
    const ids: string[] = Array.isArray(parsed?.momentIds) ? [...new Set<string>(parsed.momentIds.filter((id: unknown): id is string => typeof id === 'string'))] : [];
    const byId = new Map(entries.map(entry => [entry.id, entry]));
    const selected = ids.map(id => byId.get(id)).filter((entry): entry is MemorySource => Boolean(entry));
    const dates = new Set(selected.map(entry => new Date(entry.createdAt).toDateString()));
    const timestamps = selected.map(entry => entry.createdAt);
    const span = timestamps.length ? Math.max(...timestamps) - Math.min(...timestamps) : 0;
    return selected.length >= 3 && dates.size >= 2 && span >= 24 * 60 * 60 * 1000 ? ids : null;
  }
};
