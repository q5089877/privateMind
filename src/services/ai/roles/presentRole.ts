import type { ConversationTurn, PresentPayload, PresentResult } from '../../../domain/harbor';
import { FAST_THINKING_CONFIG, FLASH_LITE_MODEL, GeminiRoleRequest, normalizeCompanionResponse } from './shared';

export const DEFAULT_CIRCUIT_BREAKER_FALLBACK = '已留下。';
export const PRESENT_WARM_FALLBACK_PAYLOAD: PresentPayload = {
  reflection: '你剛才說：「這一刻」',
  unknown: '目前還不知道具體的事件脈絡。',
  question: '如果方便，可以多說一點剛才發生了什麼嗎？',
  scene_detected: false,
  inferenceLevel: 'none',
  stage: 'event'
};
export const PRESENT_WARM_FALLBACK = [
  PRESENT_WARM_FALLBACK_PAYLOAD.reflection,
  PRESENT_WARM_FALLBACK_PAYLOAD.unknown,
  PRESENT_WARM_FALLBACK_PAYLOAD.question
].join(' ');

export type PresentInferenceLevel = 'explicit' | 'metaphor' | 'none';

interface RawPresentPayload {
  unknown?: unknown;
  question?: unknown;
  inferenceLevel?: unknown;
  stage?: unknown;
}

const recentUserTurns = (priorTurns: ConversationTurn[]): ConversationTurn[] =>
  priorTurns.filter(turn => turn.role === 'user' && turn.content?.trim()).slice(-2);

const normalizeEvidence = (text: string): string =>
  text.normalize('NFKC').replace(/[\s\p{P}\p{S}]/gu, '').toLocaleLowerCase();

const isAuthenticEvidence = (value: unknown, sourceText: string): value is string => {
  if (typeof value !== 'string') return false;
  const normalized = normalizeEvidence(value);
  return normalized.length >= 2 && normalizeEvidence(sourceText).includes(normalized);
};

const SPECULATION_PATTERNS = [
  /(?:對方|他|她).*(?:可能|也許|或許|大概|應該|說不定)/u,
  /(?:可能|也許|或許|大概).*(?:忙|忘記|沒看到|故意|誤會|逃避|忽略)/u,
  /(?:因為|為了).*(?:對方|他|她)/u,
  /(?:試圖|想必|猜測)/u
];

const BANNED_UNKNOWN_WORDS = [
  '可能', '也許', '或許', '大概', '應該',
  '忙碌', '忘記', '沒看到', '故意', '有事',
  '因為', '為了', '藉口', '理由'
];

const NEUTRAL_UNKNOWN = '目前還不知道這個狀態發生的頻率與持續時間。';

export const presentFallback = (): PresentResult => ({
  status: 'success',
  reply: PRESENT_WARM_FALLBACK,
  payload: PRESENT_WARM_FALLBACK_PAYLOAD
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
          parts: [{ text: `你是思緒停靠的分類器。只輸出 JSON。
explicit：使用者直接說出情緒，或提供有時間、真實人物／機構及具體程序的字面事件。
metaphor：情緒藏在比喻、意象或間接語句中。
none：沒有明確情緒線索。
「法官、法庭、牢籠、深淵、黑洞、繩索、牆壁、懸崖、審判」若沒有明確時間、真實人物／機構與具體程序，一律視為 metaphor。
例如「我覺得主管像法官一樣判我死刑」是 metaphor；「今天下午兩點人資寄信說我試用期沒過」是 explicit。
無法確定時輸出 none。不要替使用者增加情緒、動機或事件。` }]
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

  readClassification(raw: string): PresentInferenceLevel {
    try {
      const parsed = JSON.parse(raw) as { inferenceLevel?: unknown };
      return parsed.inferenceLevel === 'explicit' || parsed.inferenceLevel === 'metaphor' || parsed.inferenceLevel === 'none'
        ? parsed.inferenceLevel
        : 'none';
    } catch {
      return 'none';
    }
  },

  create(current: string, priorTurns: ConversationTurn[] = [], inferenceLevel: PresentInferenceLevel = 'metaphor'): GeminiRoleRequest {
    const userPriors = recentUserTurns(priorTurns || []);
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

你是思緒停靠的 Present Companion。請輸出合法 JSON，只提供目前還不知道的客觀空白、最多一個開放式問題、分類與階段。reflection 由程式組裝；不要輸出 reflection，也不要摘錄或判定事件卡。

【約束條件】
1. 這次分類是「${inferenceLevel}」。只能依使用者明說的內容，不新增情緒或心理解釋。
2. 必須輸出 unknown、question、inferenceLevel、stage 四個欄位。unknown 必須以「目前還不知道」或「目前不確定」開頭。
3. question 最多一個；若已足夠形成可供使用者確認的事件，仍可保留一個簡短開放式問題，但不得自動推進或產生事件卡。
4. stage 只能是 event、feeling、meaning、expectation、yearning_emerged。只有使用者明確表達渴望、需要或最重要的價值時才可用 yearning_emerged，否則用 event。
5. 不得替第三方猜動機，不得使用心理診斷、創傷、人格或防禦機制等標籤。
6. 不得提供建議、命令、安慰套話或行動指導。
7. unknown 只能指出一個客觀空白，禁止替對方找理由。
8. 若最新輸入是抽象評價，不得一次索取時間、地點、人物與行為等多個欄位，只問一個具體互動。
9. 嚴禁情緒代入：使用者未明確說出的情緒詞不得自行加入任何欄位。
10. AI 不得決定何時形成事件、不得輸出 scene_detected，也不得要求使用者完成任何層級。

【輸出結構】
{"unknown":"目前還不知道……","question":"一個具體問題？","inferenceLevel":"none","stage":"event"}

禁止詞：防禦機制、防衛、自我保護、創傷、被拋棄、心理疾病、人格、診斷、建議你、你應該、試著、深呼吸、離開現場、也許對方、可能對方、對方想、對方覺得、辛苦了、別擔心、慢慢來、已留下。` }] }],
        generationConfig: {
          temperature: 0.15,
          maxOutputTokens: 200,
          thinkingConfig: FAST_THINKING_CONFIG,
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT',
            properties: {
              unknown: { type: 'STRING' },
              question: { type: 'STRING', nullable: true },
              inferenceLevel: { type: 'STRING', enum: ['explicit', 'metaphor', 'none'] },
              stage: { type: 'STRING', enum: ['event', 'feeling', 'meaning', 'expectation', 'yearning_emerged'] }
            },
            required: ['unknown', 'question', 'inferenceLevel', 'stage']
          }
        }
      }
    };
  },

  read(raw: string, current = '', inferenceLevel: PresentInferenceLevel = 'metaphor', priorTurns: ConversationTurn[] = []): PresentResult {
    const parsed = (() => {
      try { return JSON.parse(normalizeCompanionResponse(raw)) as RawPresentPayload; }
      catch { return null; }
    })();
    if (!parsed || typeof parsed.unknown !== 'string') {
      return presentFallback();
    }
    const reflection = `你剛才說：「${current.trim()}」`;
    const question = typeof parsed.question === 'string' ? parsed.question.trim() : null;
    const rawUnknown = parsed.unknown.trim();
    const unknownHasSpeculation = SPECULATION_PATTERNS.some(pattern => pattern.test(rawUnknown)) ||
      BANNED_UNKNOWN_WORDS.some(word => rawUnknown.includes(word));
    const payload: PresentPayload = {
      reflection,
      unknown: unknownHasSpeculation ? NEUTRAL_UNKNOWN : rawUnknown,
      question,
      scene_detected: false,
      inferenceLevel,
      stage: parsed.stage === 'feeling' || parsed.stage === 'meaning' || parsed.stage === 'expectation' || parsed.stage === 'yearning_emerged'
        ? parsed.stage
        : 'event'
    };
    const text = [payload.reflection, payload.unknown, payload.question].filter(Boolean).join(' ');
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
    if (questionCount > 1) {
      return presentUnavailable();
    }
    
    // 2. 禁安撫套話與工程術語
    const hasForbidden = genericForbidden.some(phrase => text.includes(phrase));
    if (hasForbidden) {
      return presentUnavailable();
    }
    
    const hasUnknownMarker = /^(?:目前還不知道|目前不確定)/u.test(payload.unknown);
    if (!hasUnknownMarker) return presentUnavailable();

    if (inferenceLevel === 'explicit' && /(也許|可能|像是)/u.test(text)) return presentUnavailable();

    // 中文沒有可靠的空白分詞；以有意義字元重疊確認回應仍錨定原文，避免要求整句逐字複誦。
    const sourceChars = [...new Set(Array.from(current).filter(char => /[\p{L}\p{N}]/u.test(char)))];
    const replyChars = new Set(Array.from(text));
    const overlapCount = sourceChars.filter(char => replyChars.has(char)).length;
    const minimumOverlap = sourceChars.length >= 8 ? 2 : sourceChars.length > 0 ? 1 : 0;
    if (overlapCount < minimumOverlap) return presentUnavailable();

    // 3. 高品質的短回應可通過，但主要回報不能膨脹成報告
    if (text.length > 160 || text.length < 8) {
      return presentUnavailable();
    }
    
    return { status: 'success', reply: text, payload };
  }
};
