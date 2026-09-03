import { FAST_THINKING_CONFIG, FLASH_LITE_MODEL, GeminiRoleRequest, normalizeCompanionResponse } from './shared';

const sourceFragments = (value: string) => {
  const clean = value.replace(/\s+/g, ' ').trim();
  if (clean.length <= 28) return [clean];
  return [clean.slice(0, 28), clean.slice(-20)];
};

export const presentFallback = (value: string) => {
  const excerpt = sourceFragments(value)[0] || '這句話';
  return `「${excerpt}」先留在這裡。這句裡，最想先補上的一段是什麼？`;
};

/** Rules for the immediate, current-Moment companion. It never reads history. */
export const presentRole = {
  create(current: string): GeminiRoleRequest {
    return {
      timeoutMs: 20_000,
      context: undefined,
      payload: {
        model: FLASH_LITE_MODEL,
        contents: [{ role: 'user', parts: [{ text: `使用者剛留下這一句：\n${current}\n\n請以繁體中文回覆剛好兩句、最多88字。只根據這一句話。第一句必須直接引用或重複其中一段 2 到 28 字的具體用語，讓人知道你讀到的是哪一句；第二句提供一個貼著那段用語的開放提問或續寫入口。不得提及過去紀錄、記憶、模式、重複或任何你未看見的內容。\n\n禁止診斷、心理標籤、建議、命令、空泛安慰、聲稱知道真正原因，也禁止使用「辛苦了」「這很正常」「真實的一刻」「一切正在運作」「允許自己」「先停下來」「休息一下」。不要替使用者下結論；保留今天不必想完的餘地。` }] }],
        generationConfig: { temperature: 0.45, maxOutputTokens: 72, responseMimeType: 'text/plain', thinkingConfig: FAST_THINKING_CONFIG }
      }
    };
  },

  read(raw: string, current: string): string {
    const text = normalizeCompanionResponse(raw);
    const grounded = sourceFragments(current).some(fragment => fragment.length >= 2 && text.includes(fragment));
    const generic = ['辛苦了', '這很正常', '真實的一刻', '一切正在運作', '允許自己', '先停下來', '休息一下'];
    return text && text.length <= 88 && grounded && !generic.some(phrase => text.includes(phrase)) ? text : presentFallback(current);
  }
};
