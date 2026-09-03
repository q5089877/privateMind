import type { ConversationTurn, ExplorePerspective } from '../../../domain/harbor';
import { FAST_THINKING_CONFIG, FLASH_LITE_MODEL, GeminiRoleRequest, parseJson } from './shared';

export const exploreRole = {
  create(turns: ConversationTurn[]): GeminiRoleRequest<{ transcript: string }> | null {
    const userTurns = turns.filter(turn => turn.role === 'user' && turn.content.trim());
    if (!userTurns.length) return null;
    const transcript = userTurns.map(turn => turn.content.trim()).join('\n').slice(-6000);
    const responseSchema = {
      type: 'OBJECT', properties: {
        perspectives: {
          type: 'ARRAY', minItems: 4, maxItems: 4, items: {
            type: 'OBJECT', properties: {
              id: { type: 'STRING', enum: ['focus', 'contrast', 'reframe', 'open'] },
              label: { type: 'STRING', description: '2 到 12 字的日常操作名稱，不可作心理或人格標籤。' },
              prompt: { type: 'STRING', description: '12 到 88 字的續寫起手式，使用第一人稱或中性語氣，必須以「……」結尾。' },
              sourcePhrases: { type: 'ARRAY', minItems: 1, maxItems: 2, items: { type: 'STRING' }, description: '從原文逐字複製、每段 2 到 28 字。' }
            }, required: ['id', 'label', 'prompt', 'sourcePhrases']
          }
        }
      }, required: ['perspectives']
    };
    return {
      timeoutMs: 14_000,
      context: { transcript },
      payload: {
        model: FLASH_LITE_MODEL,
        contents: [{ role: 'user', parts: [{ text: `以下只包含使用者在這次對話親口說過的話：\n${transcript}\n\n使用者主動選了「換個角度」。請產生剛好四個不同的續寫入口，讓他自行決定要不要使用；不是分析報告，也不是結論。\n\n四個 id 必須各用一次：\n- focus：只停在一個具體詞句。\n- contrast：把兩個原文中可並排的具體詞句放在一起；若原文沒有兩件事，改成分辨一句話中的兩個部分。\n- reframe：用原文裡已經出現的另一個說法或例外，提供不同觀看位置。\n- open：留下今天還不必回答的一處，讓人能繼續寫。\n\n每張卡的 sourcePhrases 必須逐字存在原文；prompt 也必須直接引用至少其中一段。只提供可接著寫的起手式，句末是「……」。禁止解釋、摘要、下結論、心理或人格標籤、建議、命令、診斷、因果推論、提及舊紀錄、使用「你其實」「你在」「這顯示」，以及問號。繁體中文。` }] }],
        generationConfig: { temperature: 0.28, maxOutputTokens: 420, responseMimeType: 'application/json', responseSchema, thinkingConfig: FAST_THINKING_CONFIG }
      }
    };
  },

  read(raw: string, transcript: string): ExplorePerspective[] | null {
    const parsed = parseJson(raw) as { perspectives?: unknown } | null;
    const cards = Array.isArray(parsed?.perspectives) ? parsed.perspectives : [];
    const validIds = new Set<ExplorePerspective['id']>(['focus', 'contrast', 'reframe', 'open']);
    const forbidden = ['心理', '人格', '診斷', '建議', '應該', '一定', '真正原因', '你其實', '你在', '這顯示', '?', '？'];
    const valid = cards.map((card: unknown): ExplorePerspective | null => {
      if (!card || typeof card !== 'object') return null;
      const item = card as Record<string, unknown>;
      const id = item.id;
      const label = typeof item.label === 'string' ? item.label.trim() : '';
      const prompt = typeof item.prompt === 'string' ? item.prompt.trim() : '';
      const sourcePhrases = Array.isArray(item.sourcePhrases)
        ? item.sourcePhrases.filter((phrase): phrase is string => typeof phrase === 'string').map(phrase => phrase.trim()).filter(phrase => phrase.length >= 2 && phrase.length <= 28)
        : [];
      const combined = `${label} ${prompt}`;
      const containsSource = sourcePhrases.some(phrase => transcript.includes(phrase) && prompt.includes(phrase));
      if (!validIds.has(id as ExplorePerspective['id']) || label.length < 2 || label.length > 12 || prompt.length < 12 || prompt.length > 88 || !prompt.endsWith('……') || !sourcePhrases.length || !containsSource || forbidden.some(word => combined.includes(word))) return null;
      return { id: id as ExplorePerspective['id'], label, prompt, sourcePhrases };
    }).filter((card): card is ExplorePerspective => Boolean(card));
    return valid.length === 4 && new Set(valid.map(card => card.id)).size === 4 ? valid : null;
  }
};
