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
    const validPrior = priorTurns?.filter(t => t.content && t.content.trim()) || [];
    const contextBlock = validPrior.length > 0
      ? `【本次停靠先前的對話脈絡（僅供理解代名詞與背景指涉，焦點仍請放在最新一句）】：\n` +
        validPrior.map(t => `${t.role === 'user' ? '使用者' : '同行夥伴'}：${t.content.trim()}`).join('\n') +
        '\n\n'
      : '';

    return {
      timeoutMs: 20_000,
      context: undefined,
      payload: {
        model: FLASH_LITE_MODEL,
        contents: [{ role: 'user', parts: [{ text: `${contextBlock}【使用者剛留下的最新一句】：
「${current}」

你是一位「定錨同行者」（絕非挖掘型心理諮商師、非教練、非心靈導師）。你的唯一任務是：客觀映照、收斂降噪、提供留白。
請聚焦針對【最新一句】進行映照。若上方有對話脈絡，必須自然結合上下文理解代名詞（例如「她/他/這件事」指涉的對象或情境），嚴禁失憶自說自話；但回覆重心必須落在最新這句話。

【核心原則：少解讀半步，多留白一步】
1. 客觀映照（1 到 2 句，30 至 70 字）：
   - 只陳述使用者字面上已經說出的客觀狀態與邊界，絕不自行腦補心理戲（嚴禁臆測「拔河、掙扎、排山倒海、痛苦、暗流」）。
   - 語氣清爽、平實、克制，像站在碼頭邊遞一條毛巾，而不是拿放大鏡照他的內心。

2. 煞車機制（Somatic Brake）：
   - 若使用者表達出「先等等、時間會淡化、算了、先這樣、不想想了」等暫停或交給時間的語氣：
     嚴禁拋出任何問題或二選一逼問！直接以平靜陳述句號收尾（例如：「嗯，那現在不用急著做什麼。先一起待著，也是一種選擇。」）。
   - 若使用者指出 AI「很負面/太沉重」：
     不辯解，坦率承認剛才過度聚焦在卡住的地方，並客觀點出使用者目前做到的具體平靜舉動，句號收尾。

3. 結尾規則：
   - 【絕大多數情況以句號結尾】。不主動推動對話、不逼對方做決定（嚴禁「你打算A還是B？」、「你要繼續...還是...？」）。
   - 只有在使用者明確拋出困惑時，才允許留一句極輕微的開放觀察，絕不連環逼問。

【嚴格禁止】
- 禁過度詮釋：嚴禁使用「拔河、掙扎、暗湧、撕扯、沉重」等文學修辭來誇大對方的心情。
- 禁二選一逼問：嚴禁「你打算...還是...？」、「你是不是其實...？」
- 禁說教、出作業與命令句：嚴禁「請你...」、「你應該...」。
- 禁心靈雞湯安慰：辛苦了、這很正常、放鬆、允許自己、深呼吸、這不容易。
- 禁心理學名詞：神經訊號、前額葉、防衛機制、潛意識、投射。
語氣平靜、極度克制、繁體中文。` }] }],
        generationConfig: { temperature: 0.25, maxOutputTokens: 800, responseMimeType: 'text/plain', thinkingConfig: FAST_THINKING_CONFIG }
      }
    };
  },

  read(raw: string, _current?: string): string | null {
    const text = normalizeCompanionResponse(raw);
    const generic = ['辛苦了', '這很正常', '真實的一刻', '一切正在運作', '允許自己', '先停下來', '休息一下', '法庭', '審判', '神經訊號', '注意力通道'];
    const hasForbidden = generic.some(phrase => text.includes(phrase));
    return text && text.length >= 10 && text.length <= 180 && !hasForbidden ? text : null;
  }
};
