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
        takeaway: { type: 'STRING', description: '12 到 100 字；只整理這段對話實際提過、可以帶走的一點。' },
        unresolved: { type: 'STRING', description: '4 到 72 字；指出今天可以暫不回答的一個開放處，不可變成問題或待辦。' },
        resumeAnchor: { type: 'STRING', description: '0 到 48 字；下次若想回來，可從使用者原文的一個方向接著說。' }
      }, required: ['takeaway', 'unresolved', 'resumeAnchor']
    };
    return {
      timeoutMs: 12_000,
      context: undefined,
      payload: {
        model: FLASH_LITE_MODEL,
        contents: [{ role: 'user', parts: [{ text: `以下是使用者這次親口留下的句子：\n${transcript}\n\n請替這次對話寫一個「暫時收束」，不是結論。它讓人能帶走一點已經說清楚的東西，也允許尚未回答的地方留在這裡。\n\n回傳 JSON：\n- takeaway：12 到 100 字，只根據這些句子，寫出一個具體、可帶走的整理。\n- unresolved：4 到 72 字，寫出今天可以暫不回答的開放處；不得用問號、不得形成待辦或建議。\n- resumeAnchor：0 到 48 字，用一個使用者已提過的具體方向，作為下次可接續的起點。\n\n禁止：心理、壓力、恐懼、焦慮、逃避、人格、診斷、建議、應該、一定、真正原因、你其實、你在、這顯示。不可替使用者下結論、補上沒有說過的背景。語氣平實、繁體中文。` }] }],
        generationConfig: { temperature: 0.25, maxOutputTokens: 180, responseMimeType: 'application/json', responseSchema, thinkingConfig: FAST_THINKING_CONFIG }
      }
    };
  },

  read(raw: string): SessionClosureDraft | null {
    const parsed = parseJson(raw) as Record<string, unknown> | null;
    const takeaway = typeof parsed?.takeaway === 'string' ? parsed.takeaway.trim() : '';
    const unresolved = typeof parsed?.unresolved === 'string' ? parsed.unresolved.trim() : '';
    const resumeAnchor = typeof parsed?.resumeAnchor === 'string' ? parsed.resumeAnchor.trim() : '';
    const forbidden = ['心理', '人格', '診斷', '建議', '應該', '一定', '真正原因', '你其實', '你在', '這顯示'];
    const invalid = (value: string) => forbidden.some(word => value.includes(word));
    if (takeaway.length < 12 || takeaway.length > 100 || unresolved.length < 4 || unresolved.length > 72 || resumeAnchor.length > 48 || unresolved.includes('？') || unresolved.includes('?') || invalid(takeaway) || invalid(unresolved) || invalid(resumeAnchor)) return null;
    return { takeaway, unresolved, ...(resumeAnchor ? { resumeAnchor } : {}) };
  }
};
