import type { TimelineInsight } from '../../../domain/harbor';
import { FAST_THINKING_CONFIG, FLASH_MODEL, GeminiRoleRequest, parseJson } from './shared';

export interface TimelineSource {
  date: string;
  content: string;
}

/** Rules for a time-earned reading with explicit original-text citations. */
export const timelineRole = {
  create(entries: TimelineSource[]): GeminiRoleRequest | null {
    if (entries.length < 3) return null;
    const timeline = entries.map(item => `${item.date}｜${item.content}`).join('\n');
    const responseSchema = {
      type: 'OBJECT', properties: {
        evidence: {
          type: 'ARRAY', minItems: 2, maxItems: 4, items: {
            type: 'OBJECT', properties: { date: { type: 'STRING' }, phrase: { type: 'STRING' } }, required: ['date', 'phrase']
          }
        },
        angle: { type: 'STRING' },
        unresolved: { type: 'STRING' }
      }, required: ['evidence', 'angle', 'unresolved']
    };
    return {
      timeoutMs: 8_000,
      context: undefined,
      payload: {
        model: FLASH_MODEL,
        contents: [{ role: 'user', parts: [{ text: `以下是同一條跨時間累積的原文：\n${timeline}\n\n請提供一個「分開寫時不容易看見」的新角度。它只能指出原文可驗證的缺口、轉折、重複或不對稱，不能推論原因、心理狀態或給建議。請以「這幾段裡」、「前面」或「後面」描述，不要評論使用者這個人。\n\n回傳 JSON：\n- evidence：至少兩則日期與原文逐字片段，phrase 必須從該日期的內容逐字複製。\n- angle：20 到 120 字的具體觀察；必須建立在 evidence 上，不能只是按日期重述。\n- unresolved：8 到 64 字，指出一個還可再看的地方；不得用問號、不得要求行動、不得給二選一答案或替使用者下結論。\n\n禁止：你其實、你在、這顯示、心理、壓力、恐懼、焦慮、逃避、人格、診斷、建議、應該、一定、真正原因。` }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 260, responseMimeType: 'application/json', responseSchema, thinkingConfig: FAST_THINKING_CONFIG }
      }
    };
  },

  read(raw: string, entries: TimelineSource[]): TimelineInsight | null {
    const parsed = parseJson(raw) as Record<string, unknown> | null;
    const evidence = Array.isArray(parsed?.evidence) ? parsed.evidence.map((item: unknown) => {
      const value = item as { date?: unknown; phrase?: unknown };
      return { date: typeof value.date === 'string' ? value.date.trim() : '', phrase: typeof value.phrase === 'string' ? value.phrase.trim() : '' };
    }) : [];
    const angle = typeof parsed?.angle === 'string' ? parsed.angle.trim() : '';
    const unresolved = typeof parsed?.unresolved === 'string' ? parsed.unresolved.trim() : '';
    const byDate = new Map(entries.map(entry => [entry.date, entry.content]));
    const forbidden = ['你其實', '你在', '這顯示', '心理', '壓力', '恐懼', '焦慮', '逃避', '人格', '診斷', '建議', '應該', '一定', '真正原因'];
    const bad = (value: string) => forbidden.some(word => value.includes(word));
    if (evidence.length < 2 || evidence.some(item => !item.date || !item.phrase || !byDate.get(item.date)?.includes(item.phrase)) || angle.length < 20 || angle.length > 120 || unresolved.length < 8 || unresolved.length > 64 || unresolved.includes('？') || unresolved.includes('?') || bad(angle) || bad(unresolved)) return null;
    return { evidence, angle, unresolved };
  }
};
