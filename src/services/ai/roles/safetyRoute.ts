/**
 * Mind Harbor - 生命安全前置路由 (Safety Route)
 * 
 * 依據 NIMH 與 WHO 自殺防治指引，安全路由優先於所有系統憲法（包含「零問號」與「不索取」）。
 * 拒絕將自傷危機與一般發洩詞混為一談。
 */

export type SafetyDecision = 'imminent_risk' | 'uncertain_or_third_party' | 'safe';

export interface SafetyEvaluation {
  decision: SafetyDecision;
  matchedKeyword?: string;
}

export interface CrisisResource {
  name: string;
  contact: string;
  description: string;
  url?: string;
}

export const CRISIS_RESOURCES: CrisisResource[] = [
  {
    name: '衛福部 24 小時安心專線',
    contact: '1925',
    description: '免付費電話，提供 24 小時即時心理諮詢與危機介入'
  },
  {
    name: '生命線協談專線',
    contact: '1995',
    description: '提供急難救助、心理諮商與自殺防治協談'
  },
  {
    name: '張老師輔導專線',
    contact: '1980',
    description: '提供青少年與成人心理諮商服務'
  },
  {
    name: '緊急救助與報案',
    contact: '110 / 119',
    description: '若您或身邊的人有立即生命危險，請即刻撥打'
  }
];

/**
 * 前置安全檢測：
 * 區分第一人稱自傷意圖、否定句式、第三人稱指涉與純發洩。
 */
export function evaluateSafetyRisk(rawText: string): SafetyEvaluation {
  const normalized = rawText.normalize('NFC').trim();
  if (!normalized) return { decision: 'safe' };

  // 1. 否定詞排除（如：我不想死、我沒有要去死、我絕對不要死）
  const negationPatterns = [
    /(?:不想|不打算|不要|不會|沒有想|沒想|絕不|千萬別|不會去|何必|不能)(?:去死|死|自殺|結束生命)/u,
    /(?:想活|活下去|好好的活)/u
  ];
  if (negationPatterns.some(pattern => pattern.test(normalized))) {
    return { decision: 'safe' };
  }

  // 2. 第三人稱 / 引述判定（如：老婆說她想死、朋友說活著沒意思、同事想自殺）
  const thirdPartyPatterns = [
    /(?:老婆|老公|朋友|媽媽|爸爸|家人|同事|主管|他|她|他們|有人|別人)[^，。！？\n]{0,8}(?:去死|想死|自殺|不想活|活著沒意思)/u
  ];
  if (thirdPartyPatterns.some(pattern => pattern.test(normalized))) {
    return { decision: 'uncertain_or_third_party', matchedKeyword: '第三人稱危機指涉' };
  }

  // 3. 高危自傷與致命準備行為特徵（NIMH 自殺警訊）
  const imminentRiskPatterns = [
    /(?:想死|好想死|真的想死|去死|不想活了?|活著沒意思|活著好累想結束|結束生命)/u,
    /(?:準備好藥了?|寫好遺書|買了炭|想跳樓|想上吊|吞藥|割腕|自殺|自殘)/u,
    /(?:告別世界|離開這個世界|下輩子再見|不想醒來了)/u
  ];

  for (const pattern of imminentRiskPatterns) {
    if (pattern.test(normalized)) {
      return { decision: 'imminent_risk', matchedKeyword: normalized.match(pattern)?.[0] };
    }
  }

  return { decision: 'safe' };
}
