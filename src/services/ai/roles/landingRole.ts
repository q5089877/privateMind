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
        takeaway: { type: 'STRING', description: '12 到 60 字；整理對話中已說明白的客觀事實。' },
        unresolved: { type: 'STRING', description: '8 到 36 字；只描述目前缺少的事實或不可控的外部變數。' },
        resumeAnchor: { type: 'STRING', description: '0 到 20 字；摘錄一個具體方向作為下次接點。' }
      }, required: ['takeaway', 'unresolved', 'resumeAnchor']
    };
    return {
      timeoutMs: 12_000,
      context: undefined,
      payload: {
        model: FLASH_LITE_MODEL,
        contents: [{ role: 'user', parts: [{ text: `以下是使用者這次親口留下的句子：\n${transcript}\n\n請替這次對話寫一份系統紀錄式的收束草稿：\n- takeaway（這次先帶走）：12 到 60 字，只整理對話中已明確說出的客觀事實。\n- unresolved（目前缺少的資料）：8 到 36 字，只寫目前無法驗證的事實或不可控的外部變數；只能有一句，不得寫成建議、命令或心態總結。\n- resumeAnchor（下次若要接續）：0 到 20 字，摘錄一個具體方向。\n\n負向約束：禁止比喻、詩意語句、心靈雞湯、說教、安慰或諮商語氣；禁止「營業時間」、「現實不收件」、「心靈關機」、「按下暫停鍵」、「放過自己」、「深呼吸」、「明早 09:00」及相近擬人化表達。禁止替使用者總結心態或下結論。只允許平實、中性的系統紀錄語氣，不加前言或客套。繁體中文。` }] }],
        generationConfig: { temperature: 0.25, maxOutputTokens: 350, responseMimeType: 'application/json', responseSchema, thinkingConfig: FAST_THINKING_CONFIG }
      }
    };
  },

  read(raw: string): SessionClosureDraft | null {
    const parsed = parseJson(raw) as Record<string, unknown> | null;
    const takeaway = typeof parsed?.takeaway === 'string' ? parsed.takeaway.trim() : '';
    const unresolved = typeof parsed?.unresolved === 'string' ? parsed.unresolved.trim() : '';
    const resumeAnchor = typeof parsed?.resumeAnchor === 'string' ? parsed.resumeAnchor.trim() : '';
    const forbidden = ['心理', '人格', '診斷', '建議', '應該', '一定', '真正原因', '你其實', '你在', '這顯示', '辛苦了', '營業時間', '現實不收件', '心靈關機', '按下暫停鍵', '放過自己', '深呼吸', '明早 09:00', '明早09:00'];
    const invalid = (value: string) => forbidden.some(word => value.includes(word));
    const unresolvedHasOneSentence = !/[。！？!?]/.test(unresolved.slice(0, -1));
    if (takeaway.length < 8 || takeaway.length > 80 || unresolved.length < 8 || unresolved.length > 42 || resumeAnchor.length > 24 || unresolved.includes('？') || unresolved.includes('?') || !unresolvedHasOneSentence || invalid(takeaway) || invalid(unresolved) || invalid(resumeAnchor)) return null;
    return { takeaway, unresolved, ...(resumeAnchor ? { resumeAnchor } : {}) };
  }
};
