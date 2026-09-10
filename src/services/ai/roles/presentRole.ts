import type { ConversationTurn, PresentResult } from '../../../domain/harbor';
import { FAST_THINKING_CONFIG, FLASH_LITE_MODEL, GeminiRoleRequest, normalizeCompanionResponse } from './shared';

export const DEFAULT_CIRCUIT_BREAKER_FALLBACK = '已留下。';
export const PRESENT_WARM_FALLBACK = '這段內容我先不替你下結論，目前只知道它對你有明顯影響。當時最具體發生了什麼？';

export type PresentInferenceLevel = 'explicit' | 'metaphor' | 'none';

export const presentFallback = (): PresentResult => ({
  status: 'success',
  reply: PRESENT_WARM_FALLBACK
});

export const presentAcknowledgement = (): PresentResult => ({
  status: 'acknowledged',
  reply: DEFAULT_CIRCUIT_BREAKER_FALLBACK
});

const presentUnavailable = (): PresentResult => presentFallback();

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
  classify(current: string): GeminiRoleRequest {
    return {
      timeoutMs: 8_000,
      context: undefined,
      payload: {
        model: FLASH_LITE_MODEL,
        contents: [{ role: 'user', parts: [{ text: `請只判斷以下使用者輸入中的情緒是否已被明確說出，或需要從隱喻推論。不要解釋，不要重寫原文。\n\n使用者輸入：\n「${current}」` }] }],
        systemInstruction: {
          parts: [{ text: '你是情緒表達分類器。只輸出 JSON。explicit 代表使用者直接說出情緒；metaphor 代表情緒藏在比喻、意象或間接語句中；none 代表沒有明確情緒線索。無法確定時輸出 metaphor。' }]
        },
        generationConfig: {
          temperature: 0,
          maxOutputTokens: 30,
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT',
            properties: { inferenceLevel: { type: 'STRING', enum: ['explicit', 'metaphor', 'none'] } },
            required: ['inferenceLevel']
          },
          thinkingConfig: FAST_THINKING_CONFIG
        }
      }
    };
  },

  readClassification(raw: string): PresentInferenceLevel | null {
    try {
      const parsed = JSON.parse(raw) as { inferenceLevel?: unknown };
      return parsed.inferenceLevel === 'explicit' || parsed.inferenceLevel === 'metaphor' || parsed.inferenceLevel === 'none'
        ? parsed.inferenceLevel
        : null;
    } catch {
      return null;
    }
  },

  create(current: string, priorTurns: ConversationTurn[] = [], inferenceLevel: PresentInferenceLevel = 'metaphor'): GeminiRoleRequest {
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

你是思緒停靠的 Present Companion。先準確映照使用者的感受，再清楚說明目前還不知道的部分，最後只提出一個具體問題。

【約束條件】
1. 這次分類是「${inferenceLevel}」。${inferenceLevel === 'explicit' ? '只能確認使用者已明說的情緒，不新增情緒或心理解釋。' : inferenceLevel === 'metaphor' ? '可以提出一個低強度的情緒映照，但必須使用「有一種」或「像是」，不能診斷或定義使用者。' : '只陳述原文可確認的狀態，不自行補上情緒。'}
2. 必須先寫情緒映照，再寫目前還不知道的部分，最後提出一個問題。
3. 不得替第三方猜動機，不得使用心理診斷、創傷、人格或防禦機制等標籤。
4. 不得提供建議、命令、安慰套話或行動指導。
5. 使用 3 句繁體中文，總字數 45 至 160 字；只能有一個問號。
6. 只使用原文與本次明確提供的對話內容，不補造事件。

【輸出結構】
- 第一句：情緒或狀態映照。
- 第二句：明確說出目前還不知道的部分。
- 第三句：只問一個逐步靠近具體情境的問題。

禁止詞：防禦機制、防衛、自我保護、創傷、被拋棄、心理疾病、人格、診斷、建議你、你應該、試著、深呼吸、離開現場、也許對方、可能對方、對方想、對方覺得、辛苦了、別擔心、慢慢來、已留下。` }] }],
        generationConfig: {
          temperature: 0.15,
          maxOutputTokens: 200,
          responseMimeType: 'text/plain',
          thinkingConfig: FAST_THINKING_CONFIG
        }
      }
    };
  },

  read(raw: string, current = '', inferenceLevel: PresentInferenceLevel = 'metaphor'): PresentResult {
    const text = normalizeCompanionResponse(raw);
    if (text === DEFAULT_CIRCUIT_BREAKER_FALLBACK) {
      // Acknowledgement is reserved for the deterministic local gate. If the
      // remote model returns it, the requested Present analysis was unavailable.
      return presentUnavailable();
    }
    const genericForbidden = [
      '辛苦了', '這很正常', '真實的一刻', '一切正在運作', '允許自己', '先停下來', '休息一下',
      '法庭', '審判', '神經訊號', '注意力通道', '看得出來', '聽得出來', '別擔心', '慢慢來', '深呼吸',
      '不用去追問', '這不容易',
      '防禦機制', '防衛', '自我保護', '創傷', '被拋棄', '心理疾病', '人格', '診斷', '建議你', '你應該', '試著',
      '離開現場', '喝杯水', '也許對方', '可能對方', '對方想', '對方覺得',
      // 防禦系統提示詞後設語言外洩 (Anti-Meta Prompt Leak)
      '實體變數', '停止運算', '邏輯推演', '外部邊界', '外部變數', '不可控變數', '無法取得新資料', '中斷處理', '運算核心'
    ];
    
    // 1. Present 必須只提出一個問題
    const questionCount = (text.match(/[?？]/g) || []).length;
    if (questionCount !== 1) {
      return presentUnavailable();
    }
    
    // 2. 禁安撫套話與工程術語
    const hasForbidden = genericForbidden.some(phrase => text.includes(phrase));
    if (hasForbidden) {
      return presentUnavailable();
    }
    
    const hasUnknownMarker = ['還不知道', '尚未知道', '目前不確定', '原文沒有', '目前無法確認', '沒有說明'].some(marker => text.includes(marker));
    if (!hasUnknownMarker) return presentUnavailable();

    if (inferenceLevel === 'explicit' && /(也許|可能|像是)/u.test(text)) return presentUnavailable();
    if (inferenceLevel === 'metaphor' && (text.match(/也許|可能|像是|有一種/gu) || []).length > 2) return presentUnavailable();

    const sourceWords = current.replace(/[，。、！？\s]/g, ' ').split(' ').filter(word => word.length >= 2);
    if (sourceWords.length > 0 && !sourceWords.some(word => text.includes(word))) return presentUnavailable();

    // 3. 高品質的短回應可通過，但主要回報不能膨脹成報告
    if (text.length > 160 || text.length < 30) {
      return presentUnavailable();
    }
    
    return { status: 'success', reply: text };
  }
};
