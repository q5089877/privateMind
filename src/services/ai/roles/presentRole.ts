import { FAST_THINKING_CONFIG, FLASH_LITE_MODEL, GeminiRoleRequest, normalizeCompanionResponse } from './shared';

const sourceFragments = (value: string) => {
  const clean = value.replace(/\s+/g, ' ').trim();
  if (clean.length <= 28) return [clean];
  return [clean.slice(0, 28), clean.slice(-20)];
};

export const presentFallback = (value: string) => {
  const excerpt = sourceFragments(value)[0] || '這句話';
  return `「${excerpt}」已經留下來。眼前最卡住、最想先分清的是哪一部分？`;
};

/** Rules for the immediate, current-Moment companion. It never reads history. */
export const presentRole = {
  create(current: string): GeminiRoleRequest {
    return {
      timeoutMs: 20_000,
      context: undefined,
      payload: {
        model: FLASH_LITE_MODEL,
        contents: [{ role: 'user', parts: [{ text: `使用者剛留下這句話：
「${current}」

你是一位說話平實、冷靜、深刻的同行夥伴（像是清醒的朋友，絕不是心理諮商師、不是說教老師、也不是神經學教科書）。
請以繁體中文回覆 2 到 3 句（60 到 120 字）。只根據使用者說出的內容：

1. 第一句（點出拉扯）：用極平實的日常大白話，直接指出這句話裡的實質矛盾、拉扯或懸置狀態。嚴禁複誦原句超過 6 個字。
2. 第二句（還原重量）：指出這件事在腦中盤旋時感覺排山倒海，但在當下這個時間點，客觀事實往往比腦中預演的單純。嚴禁憑空捏造使用者沒說過的情境或物品（如桌子、時鐘、房間、電腦等）。
3. 第三句（自然提問）：留一個平靜、沒有壓迫感、讓對方容易接話的續談問句，絕不下指令、不出題目作業、不替對方下結論。

【嚴格禁止】
- 禁學術與教科書術語：神經訊號、注意力通道、前額葉、多工處理、防衛機制、潛意識、心理、人格。
- 禁憑空捏造背景：不可腦補任何使用者沒提到的物理環境（桌子、椅子、房間、電腦等）。
- 禁說教、出作業與命令句：嚴禁「請你...」、「請挑選...」、「隨機挑選字數最少」、「你應該...」。
- 禁安慰套話：辛苦了、這很正常、放鬆、允許自己、深呼吸、這不容易。
- 禁傲慢診斷：你其實是在、這顯示出、真正原因、你只是。
- 禁文學修辭：法庭、審判、黑夜、鐘聲等虛構比喻。
語氣冷靜、自然口語、真誠、繁體中文。` }] }],
        generationConfig: { temperature: 0.35, maxOutputTokens: 1600, responseMimeType: 'text/plain', thinkingConfig: FAST_THINKING_CONFIG }
      }
    };
  },

  read(raw: string, current: string): string {
    const text = normalizeCompanionResponse(raw);
    const fragments = sourceFragments(current);
    const generic = ['辛苦了', '這很正常', '真實的一刻', '一切正在運作', '允許自己', '先停下來', '休息一下', '法庭', '審判', '神經訊號', '注意力通道'];
    const hasForbidden = generic.some(phrase => text.includes(phrase));
    return text && text.length >= 25 && text.length <= 180 && !hasForbidden ? text : presentFallback(current);
  }
};
