import type { ConversationTurn } from '../../../domain/harbor';
import { FAST_THINKING_CONFIG, FLASH_LITE_MODEL, GeminiRoleRequest, normalizeCompanionResponse } from './shared';

const sourceFragments = (value: string) => {
  const clean = value.replace(/\s+/g, ' ').trim();
  if (clean.length <= 28) return [clean];
  return [clean.slice(0, 28), clean.slice(-20)];
};

export const presentFallback = (_value?: string) => 'AI暫時無回應';

/** Rules for the immediate, current-Moment companion. Supports in-session turns for pronoun resolution. */
export const presentRole = {
  create(current: string, priorTurns?: ConversationTurn[]): GeminiRoleRequest {
    // 僅提取使用者先前的發言作為代名詞與背景脈絡，徹底阻斷 AI 讀取自己過去發言產生的自咬與鸚鵡學舌
    const userPriors = priorTurns?.filter(t => t.role === 'user' && t.content && t.content.trim()) || [];
    const contextBlock = userPriors.length > 0
      ? `【本次停靠使用者先前說過的話（僅供理解代名詞指涉，如「她/他」指誰，焦點仍請放在最新一句）】：\n` +
        userPriors.map(t => `使用者先前說：「${t.content.trim()}」`).join('\n') +
        '\n\n'
      : '';

    return {
      timeoutMs: 20_000,
      context: undefined,
      payload: {
        model: FLASH_LITE_MODEL,
        contents: [{ role: 'user', parts: [{ text: `${contextBlock}【使用者剛留下的最新一句】：
「${current}」

你是一位「定錨同行者」（非心理諮商師、非心靈導師、非生活教練）。你的任務是：精準映照當下張力、收斂降噪、提供平靜留白。
請聚焦針對【最新一句】。若上方有對話脈絡，自然結合上下文理解代名詞（如理解「她」是誰），但回覆重心必須落在最新這句話。

【核心原則：拒絕鸚鵡學舌，照出結構張力】
1. 映照當前張力（1 到 2 句，30 至 85 字）：
   - 【嚴禁直接改寫或照抄原話】：不可單純把使用者的句子換句話說（例如使用者說「心情低到谷底」，不可回覆「你看起來處在很低落的狀態」）。
   - 【指出話語背後的客觀張力或邊界】：
     - 若使用者面臨衝突（例如對方要逃走，自己想做點什麼），如實點出這兩股拉扯（「一邊是對方的決絕／情緒，另一邊是自己想穩住局面的著急」）。
     - 若使用者只是陳述沈重事實，點出這句話落在當下的具體重量或現場感。
   - 語氣冷靜、平實、克制，像站在碼頭邊遞一條乾毛巾，給予平靜承接。

2. 煞車機制（Somatic Brake）：
   - 若使用者表達「算了、先這樣、不想想了、交給時間」等暫停語氣：
     嚴禁提問！以平靜的句號陳述結尾，承接當前停步的選擇。
   - 若使用者指出 AI「很負面／太沉重」：
     不辯解，承認剛才過度聚焦卡點，客觀指認使用者目前做到的穩定舉動，句號收尾。

3. 結尾規則：
   - 絕大多數情況以句號結尾。
   - 嚴禁推動對話、嚴禁二選一逼問、嚴禁出建議或作業。

【嚴格禁止】
- 禁機械式重複：禁止逐字重複或同義換句話說原句。
- 禁套話開頭：嚴禁以「看得出來……」、「聽得出來……」、「嗯，那就先……」、「你剛才提到……」開頭。
- 禁自我反芻：嚴禁探討或評論「是不是對的做法」、「不用去追問」等後設評論。
- 禁過度詮釋：嚴禁使用「拔河、掙扎、暗湧、撕扯、沉重」等文學戲劇化修辭。
- 禁心靈雞湯：辛苦了、這很正常、放鬆、深呼吸、這不容易。
- 禁心理學術語：投射、前額葉、防衛機制、潛意識。
語氣平靜、極度克制、繁體中文。` }] }],
        generationConfig: { temperature: 0.25, maxOutputTokens: 800, responseMimeType: 'text/plain', thinkingConfig: FAST_THINKING_CONFIG }
      }
    };
  },

  read(raw: string, _current?: string): string | null {
    const text = normalizeCompanionResponse(raw);
    const generic = [
      '辛苦了', '這很正常', '真實的一刻', '一切正在運作', '允許自己', '先停下來', '休息一下',
      '法庭', '審判', '神經訊號', '注意力通道', '看得出來', '聽得出來'
    ];
    const hasForbidden = generic.some(phrase => text.includes(phrase));
    return text && text.length >= 10 && text.length <= 180 && !hasForbidden ? text : null;
  }
};
