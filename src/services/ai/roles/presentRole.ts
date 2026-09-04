import { FAST_THINKING_CONFIG, FLASH_LITE_MODEL, GeminiRoleRequest, normalizeCompanionResponse } from './shared';

const sourceFragments = (value: string) => {
  const clean = value.replace(/\s+/g, ' ').trim();
  if (clean.length <= 28) return [clean];
  return [clean.slice(0, 28), clean.slice(-20)];
};

export const presentFallback = (value: string) => {
  const excerpt = sourceFragments(value)[0] || '這句話';
  return `「${excerpt}」是你此刻最想留下的部分。這句已經說出眼前的狀態，但真正卡住的位置還沒有完全展開。如果想接著看，此刻最想讓人理解的是哪一部分？`;
};

/** Rules for the immediate, current-Moment companion. It never reads history. */
export const presentRole = {
  create(current: string): GeminiRoleRequest {
    return {
      timeoutMs: 20_000,
      context: undefined,
      payload: {
        model: FLASH_LITE_MODEL,
        contents: [{ role: 'user', parts: [{ text: `使用者剛留下這一句：\n${current}\n\n請以繁體中文回覆 2 到 3 句、60 到 160 個中文字。只根據這一句話。第一句必須直接引用或重複其中一段 2 到 28 字的具體用語，準確映照使用者說出的狀態；第二句指出一個能從原文驗證、但使用者可能尚未說明白的新理解，若含推測必須用「也許」「可能」「像是」；最後一句只留一個貼著原話、可選擇回答的續談入口。不要把三句都寫成問題，也不要只是換句話說。不得提及過去紀錄、記憶、模式、重複或任何你未看見的內容。\n\n禁止診斷、心理標籤、建議、命令、空泛安慰、聲稱知道真正原因，也禁止使用「辛苦了」「這很正常」「真實的一刻」「一切正在運作」「允許自己」「先停下來」「休息一下」。不要替使用者下結論；保留今天不必想完的餘地。` }] }],
        generationConfig: { temperature: 0.45, maxOutputTokens: 160, responseMimeType: 'text/plain', thinkingConfig: FAST_THINKING_CONFIG }
      }
    };
  },

  read(raw: string, current: string): string {
    const text = normalizeCompanionResponse(raw);
    const grounded = sourceFragments(current).some(fragment => fragment.length >= 2 && text.includes(fragment));
    const generic = ['辛苦了', '這很正常', '真實的一刻', '一切正在運作', '允許自己', '先停下來', '休息一下'];
    return text && text.length >= 48 && text.length <= 160 && grounded && !generic.some(phrase => text.includes(phrase)) ? text : presentFallback(current);
  }
};
