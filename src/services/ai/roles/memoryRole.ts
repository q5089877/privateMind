import { FAST_THINKING_CONFIG, FLASH_LITE_MODEL, GeminiRoleRequest, parseJson } from './shared';

export interface MemorySource {
  id: string;
  createdAt: number;
  date: string;
  content: string;
}

/**
 * Literal-anchor retrieval role.
 *
 * The AI's sole job: select IDs whose content shares a concrete, word-level
 * anchor (same name, place, recurring action, or recurring blocker). It must
 * NOT group by theme, emotion, or inference. It returns an empty list when
 * no literal overlap is found.
 *
 * Interpretation is strictly forbidden here. The display layer shows only
 * the original quotes — no AI-generated text ever reaches the user.
 */
export const memoryRole = {
  create(entries: MemorySource[]): GeminiRoleRequest | null {
    if (entries.length < 3) return null;
    const timeline = entries.map(item => `[${item.id}] ${item.date}｜${item.content}`).join('\n');
    return {
      timeoutMs: 8_000,
      context: undefined,
      payload: {
        model: FLASH_LITE_MODEL,
        contents: [{ role: 'user', parts: [{ text: `以下是使用者在不同時間留下的原文：\n${timeline}\n\n只選出 3 到 4 筆在**字面上**能看見共同具體錨點的記錄。\n\n「字面錨點」的定義：相同的人名、地名、事件名稱、或反覆出現的同一種做不到的動作。\n\n禁止：不可以用主題歸納（如「都在說壓力」），不可以用情緒歸納（如「都很煩」），不可以推論原因或模式。只看字面上出現相同的詞。\n\n找不到字面錨點時，回傳 {"momentIds":[]}。不要解釋選擇理由。` }] }],
        generationConfig: {
          temperature: 0.0, maxOutputTokens: 96, responseMimeType: 'application/json',
          responseSchema: { type: 'OBJECT', properties: { momentIds: { type: 'ARRAY', maxItems: 4, items: { type: 'STRING' } } }, required: ['momentIds'] },
          thinkingConfig: FAST_THINKING_CONFIG
        }
      }
    };
  },

  read(raw: string, entries: MemorySource[]): string[] | null {
    const parsed = parseJson(raw) as { momentIds?: unknown } | null;
    const ids: string[] = Array.isArray(parsed?.momentIds)
      ? [...new Set<string>(parsed.momentIds.filter((id: unknown): id is string => typeof id === 'string'))]
      : [];
    const byId = new Map(entries.map(e => [e.id, e]));
    const selected = ids.map(id => byId.get(id)).filter((e): e is MemorySource => Boolean(e));
    // Must span at least 2 distinct calendar days
    const dates = new Set(selected.map(e => new Date(e.createdAt).toDateString()));
    return selected.length >= 3 && dates.size >= 2 ? ids : null;
  }
};

