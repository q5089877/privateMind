import type { ConversationTurn, SessionClosureDraft } from '../../../domain/harbor';
import { FAST_THINKING_CONFIG, FLASH_LITE_MODEL, GeminiRoleRequest, parseJson } from './shared';

/** Rules for the temporary landing. Only the person's own session turns are evidence. */
export const landingRole = {
  create(turns: ConversationTurn[]): GeminiRoleRequest | null {
    const userTurns = turns.filter(turn => turn.role === 'user' && turn.content.trim());
    if (!userTurns.length) return null;
    const transcript = userTurns.map(turn => `使用者：${turn.content}`).join('\n');
    const responseSchema = {
      type: 'OBJECT', properties: {
        takeaway: { type: 'STRING', description: '15 到 80 字；整理對話中已說明白的客觀事實。' },
        unresolved: { type: 'STRING', description: '10 到 60 字；指認今晚即使想破頭也沒有新資訊、明天才能驗證的外部變數。' },
        resumeAnchor: { type: 'STRING', description: '0 到 35 字；摘錄一個具體方向作為下次接點。' }
      }, required: ['takeaway', 'unresolved', 'resumeAnchor']
    };
    return {
      timeoutMs: 12_000,
      context: undefined,
      payload: {
        model: FLASH_LITE_MODEL,
        contents: [{ role: 'user', parts: [{ text: `以下是使用者這次親口留下的句子：\n${transcript}\n\n請替這次對話寫一份「物理封存草稿」，協助大腦畫下今日思考的邊界：\n- takeaway（這次先帶走）：15 到 80 字，整理對話中已經說明白的客觀事實。\n- unresolved（留在明天看）：10 到 60 字，明確指認出「今晚即使想破頭也沒有新資訊、必須明天才能驗證」的外部變數；不得用問號、不得形成待辦或建議。\n- resumeAnchor（下次若要接著談）：0 到 35 字，摘錄一個具體方向作為下次接點。\n\n禁止任何心理診斷、說教、同理套話（辛苦了、這很正常）、你其實、你在、這顯示。不可替使用者下結論。語氣冷靜平實、繁體中文。` }] }],
        generationConfig: { temperature: 0.25, maxOutputTokens: 200, responseMimeType: 'application/json', responseSchema, thinkingConfig: FAST_THINKING_CONFIG }
      }
    };
  },

  read(raw: string): SessionClosureDraft | null {
    const parsed = parseJson(raw) as Record<string, unknown> | null;
    const takeaway = typeof parsed?.takeaway === 'string' ? parsed.takeaway.trim() : '';
    const unresolved = typeof parsed?.unresolved === 'string' ? parsed.unresolved.trim() : '';
    const resumeAnchor = typeof parsed?.resumeAnchor === 'string' ? parsed.resumeAnchor.trim() : '';
    const forbidden = ['心理', '人格', '診斷', '建議', '應該', '一定', '真正原因', '你其實', '你在', '這顯示', '辛苦了'];
    const invalid = (value: string) => forbidden.some(word => value.includes(word));
    if (takeaway.length < 10 || takeaway.length > 100 || unresolved.length < 4 || unresolved.length > 80 || resumeAnchor.length > 48 || unresolved.includes('？') || unresolved.includes('?') || invalid(takeaway) || invalid(unresolved) || invalid(resumeAnchor)) return null;
    return { takeaway, unresolved, ...(resumeAnchor ? { resumeAnchor } : {}) };
  }
};
