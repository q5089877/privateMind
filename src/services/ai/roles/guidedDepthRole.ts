import { FAST_THINKING_CONFIG, FLASH_LITE_MODEL, GeminiRoleRequest, normalizeCompanionResponse } from './shared';

export type GuidedDepthLayer = 'meaning' | 'expectation' | 'yearning';

export interface GuidedDepthSource {
  event?: string;
  feeling?: string;
  meaning?: string;
  expectation?: string;
}

export interface GuidedDepthGuide {
  layer: GuidedDepthLayer;
  question: string;
}

const FALLBACKS: Record<GuidedDepthLayer, string> = {
  meaning: '聽到這些消息時，你心裡第一個冒出的念頭是什麼？',
  expectation: '回到當時，你原本希望對方或自己怎麼做？',
  yearning: '在這份期待下面，對你而言最重要的是什麼？'
};

const BANNED = ['你其實', '你真正想要', '你應該', '你必須', '診斷', '創傷', '人格', '一定是', '代表你就是'];

const hasBannedLanguage = (value: string) => BANNED.some(word => value.includes(word));

export const guidedDepthFallback = (layer: GuidedDepthLayer): GuidedDepthGuide => ({
  layer,
  question: FALLBACKS[layer]
});

export const guidedDepthRole = {
  create(layer: GuidedDepthLayer, source: GuidedDepthSource): GeminiRoleRequest<GuidedDepthSource> {
    const sourceBlock = Object.entries(source)
      .filter(([, value]) => typeof value === 'string' && value.trim())
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n');

    return {
      timeoutMs: 12_000,
      context: source,
      payload: {
        model: FLASH_LITE_MODEL,
        contents: [{ role: 'user', parts: [{ text: `請根據以下同一件事中使用者自己留下的原文，為「${layer}」層寫出一個溫和、具體、可以自行回答的單一問題。\n\n${sourceBlock}` }] }],
        systemInstruction: {
          parts: [{ text: `你是思緒停靠的 Guided Depth Companion。只輸出 JSON：{"question":"..."}。

規則：
1. 只能根據提供的使用者原文提問，不替使用者推論答案，不替使用者命名情緒、需求或核心渴望。
2. 只問一個問題，使用繁體中文，8 到 60 個中文字。
3. 問句要貼近當前層級：meaning 問「腦中冒出的念頭或理解」；expectation 問「原本希望對方或自己怎麼做」；yearning 問「期待背後重視的事」。
4. 可以引用原文中的詞，但不要把引用改寫成事實或結論。
5. 不得使用「你其實」、「你真正想要」、「你應該」、「你必須」，不得診斷、安慰、命令或替使用者做決定。
6. 不要要求補齊時間、地點、人物等事件欄位，也不要自動推進任何層級。` }]
        },
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 100,
          thinkingConfig: FAST_THINKING_CONFIG,
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT',
            properties: { question: { type: 'STRING' } },
            required: ['question']
          }
        }
      }
    };
  },

  read(raw: string, layer: GuidedDepthLayer): GuidedDepthGuide | null {
    try {
      const parsed = JSON.parse(normalizeCompanionResponse(raw)) as { question?: unknown };
      if (typeof parsed.question !== 'string') return null;
      const question = parsed.question.trim();
      const length = Array.from(question.replace(/[\s「」『』]/gu, '')).length;
      if (!question || length < 8 || length > 60 || hasBannedLanguage(question)) return null;
      if ((question.match(/[？?]/gu) || []).length !== 1) return null;
      return { layer, question };
    } catch {
      return null;
    }
  }
};
