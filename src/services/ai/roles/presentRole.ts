import type { ConversationTurn } from '../../../domain/harbor';
import { FAST_THINKING_CONFIG, FLASH_LITE_MODEL, GeminiRoleRequest, normalizeCompanionResponse } from './shared';

export const DEFAULT_CIRCUIT_BREAKER_FALLBACK = '已留下。';

export const presentFallback = (_value?: string) => DEFAULT_CIRCUIT_BREAKER_FALLBACK;

/**
 * 成本與純發洩短路門 (Cost & Vent Gate)：
 * 攔截單純髒話發洩、無效重複字元與純符號，不消耗任何網路與 Token。
 * 注意：自傷與危機詞彙由獨立的 evaluateSafetyRisk 處理，不在此短路。
 */
export const shouldShortCircuitLocally = (input: string): boolean => {
  const clean = input.normalize('NFC').trim();
  // 規則一：極短字串分流（含漢字時門檻為 4，避免誤殺「客戶違約」、「主管甩鍋」等外部客觀事件）
  const hasCJK = /\p{Script=Han}/u.test(clean);
  const minLength = hasCJK ? 4 : 5;
  if (clean.length < minLength) return true;

  // 規則二：純標點符號、空白或 Emoji
  if (/^[\p{P}\p{S}\s]+$/u.test(clean)) return true;

  const stripped = clean.replace(/[\p{P}\p{S}\s]/gu, '');

  // 規則三：純髒話與無結構發洩詞庫
  const pureVents = [
    '幹你娘', '操你媽', '三小', '機掰', '雞掰', '靠北', '靠腰',
    '煩死了', '累死了', '媽的', '白癡', '智障', '爛透了', '崩潰', '死定了', '好煩好累'
  ];
  if (pureVents.some(vent => stripped === vent || clean === vent)) return true;

  // 規則四：純狀聲詞/虛詞（如：啊啊啊啊、嗚嗚嗚嗚、哈哈哈哈）
  if (/^[啊哈呵嘻嗚喔唉啦呀哇喵嗷草淦]+$/u.test(stripped)) return true;

  // 規則五：重複字元檢測（先剝除連續重複前綴，如「哈哈哈哈我真的受不了」-> 剩下「我真的受不了」則不誤殺）
  const withoutPrefixRepeats = stripped.replace(/^(.)\1{2,}/u, '');
  if (withoutPrefixRepeats.length >= 4) {
    return false;
  }

  const chars = Array.from(stripped);
  if (chars.length >= 4) {
    const counts = new Map<string, number>();
    let maxCount = 0;
    for (const c of chars) {
      const cnt = (counts.get(c) || 0) + 1;
      counts.set(c, cnt);
      if (cnt > maxCount) maxCount = cnt;
    }
    if (maxCount / chars.length >= 0.6) return true;
  }

  return false;
};

/** Rules for the immediate, current-Moment companion (Circuit Breaker). */
export const presentRole = {
  create(current: string, priorTurns?: ConversationTurn[]): GeminiRoleRequest {
    const userPriors = priorTurns?.filter(t => t.role === 'user' && t.content && t.content.trim()) || [];
    const contextBlock = userPriors.length > 0
      ? `【本次對話先前輸入（僅供解析代名詞指涉，核心聚焦最新輸入）】：\n` +
        userPriors.map(t => `先前記錄：「${t.content.trim()}」`).join('\n') +
        '\n\n'
      : '';

    return {
      timeoutMs: 15_000,
      context: undefined,
      payload: {
        model: FLASH_LITE_MODEL,
        contents: [{ role: 'user', parts: [{ text: `${contextBlock}【使用者輸入】：
「${current}」

你不是心理諮商師，也不是同理心機器。
你的任務是針對使用者卡住的思緒，用冷靜平實的日常口語，點出客觀的事實邊界。

【約束條件】
1. 禁止重複、重組或換句話說（Paraphrase）使用者的語句。
2. 禁止使用任何情感安撫詞（如：「辛苦了」、「別擔心」、「慢慢來」、「看得出來」、「聽得出來」、「一切正在運作」）。
3. 嚴格禁止使用電腦程式、系統架構或工程術語（例如：「實體變數」、「外部邊界」、「邏輯推演」、「停止運算」、「變數」、「中斷」、「資料」等）。
4. 嚴格限於「兩句話」以內，繁體中文，總字數 30 至 70 字。
5. 嚴格禁止問號（？與 ?），一律以句號結尾。
6. 嚴禁三流文學譬喻（如：暗湧、撕扯、神經訊號、法庭審判）。

【輸出結構（二選一，禁止其他廢話）】
A. 結構成立時（兩句話，禁止第三句）：
- [第一句：客觀事實] 指出眼前當下無法立即改變的現實或對方的決定。
- [第二句：邊界安放] 說明此時此刻在腦中反覆推敲並不會改變結果。以句號結尾。

B. 結構不足時（資訊過於零碎、純情緒發洩、或無法拆解）：
- 僅輸出：已留下。

【範例對照】
輸入：我快被這個專案搞瘋了，客戶一直改需求。
輸出：客戶的需求調整屬於對方的決定，繼續焦慮並不會改變現有進度。今晚反覆琢磨無法得到新答案，事情留到上班再處理。

輸入：煩死了。
輸出：已留下。

輸入：幹。
輸出：已留下。` }] }],
        generationConfig: {
          temperature: 0.15,
          maxOutputTokens: 200,
          responseMimeType: 'text/plain',
          thinkingConfig: FAST_THINKING_CONFIG
        }
      }
    };
  },

  read(raw: string, _current?: string): string {
    const text = normalizeCompanionResponse(raw);
    const genericForbidden = [
      '辛苦了', '這很正常', '真實的一刻', '一切正在運作', '允許自己', '先停下來', '休息一下',
      '法庭', '審判', '神經訊號', '注意力通道', '看得出來', '聽得出來', '別擔心', '慢慢來', '深呼吸',
      '不用去追問', '這不容易',
      // 防禦系統提示詞後設語言外洩 (Anti-Meta Prompt Leak)
      '實體變數', '停止運算', '邏輯推演', '外部邊界', '外部變數', '不可控變數', '無法取得新資料', '中斷處理', '運算核心'
    ];
    
    // 1. 禁問號
    if (text.includes('?') || text.includes('？')) {
      return DEFAULT_CIRCUIT_BREAKER_FALLBACK;
    }
    
    // 2. 禁安撫套話與工程術語
    const hasForbidden = genericForbidden.some(phrase => text.includes(phrase));
    if (hasForbidden) {
      return DEFAULT_CIRCUIT_BREAKER_FALLBACK;
    }
    
    // 3. 字數邊界控制 (大於 100 字或過短判定為未收斂，熔斷)
    if (text.length > 100 || text.length < 6) {
      return DEFAULT_CIRCUIT_BREAKER_FALLBACK;
    }
    
    return text;
  }
};
