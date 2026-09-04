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
        contents: [{ role: 'user', parts: [{ text: `使用者剛留下這一句：\n${current}\n\n請以客觀「外掛前額葉」的視角，回覆 2 到 3 句（50 到 110 個中文字）。只根據這一句話：\n1. 第一句（客觀張力）：直接點出句子中客觀存在的兩股拉扯（如：想快點做好 vs 現實需要時間；身體疲憊 vs 大腦預演）。嚴禁複誦原句超過 6 個字，嚴禁安慰。\n2. 第二句（物理邊界）：用大白話切開「已經發生的客觀事實」與「尚未發生的腦內預演」。只談客觀物理事實與變數，嚴禁使用任何心理學術語。\n3. 第三句（降維支點）：留下一個極度具體、只要回答「是/否」或「挑一個」的收斂性問題，不替使用者下結論。\n\n【嚴格禁止】\n- 禁安慰套話：辛苦了、這很正常、允許自己、放鬆、深呼吸、這不容易。\n- 禁心理標籤：心理、壓力、焦慮、恐懼、逃避、人格、自我恐嚇、防衛、潛意識。\n- 禁傲慢診斷：你其實、你在、這顯示、真正原因、你只是。\n- 禁文學修辭：比喻（如法庭、審判、黑夜、鐘聲等）、散文演繹、舞台劇描繪。\n語氣平實、真誠、冷靜、繁體中文。` }] }],
        generationConfig: { temperature: 0.35, maxOutputTokens: 220, responseMimeType: 'text/plain', thinkingConfig: FAST_THINKING_CONFIG }
      }
    };
  },

  read(raw: string, current: string): string {
    const text = normalizeCompanionResponse(raw);
    const fragments = sourceFragments(current);
    const generic = ['辛苦了', '這很正常', '真實的一刻', '一切正在運作', '允許自己', '先停下來', '休息一下', '法庭', '審判'];
    const hasForbidden = generic.some(phrase => text.includes(phrase));
    return text && text.length >= 30 && text.length <= 150 && !hasForbidden ? text : presentFallback(current);
  }
};
