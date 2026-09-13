import { FAST_THINKING_CONFIG, FLASH_LITE_MODEL, GeminiRoleRequest, normalizeCompanionResponse } from './shared';

export type CoreLens = 'diamond_sutra' | 'i_ching';
export interface CoreAnswerSource { content: string; recentContext?: string[]; preferredLens?: CoreLens; }
export interface CoreAnswer { lens: CoreLens; coreQuestion: string; answer: string; plainLanguage: string; reflectionQuestion: string; }

export const CORE_QUESTIONS = [
  '我是不是把一個念頭當成了事實？',
  '我是不是把彼此的角色或立場，當成了對方的全部？',
  '哪些是眼前已經發生的事，哪些是我對過去或未來的推想？',
  '在不急著改變別人的前提下，我現在能做什麼？',
] as const;

const FALLBACK: CoreAnswer = {
  lens: 'diamond_sutra',
  coreQuestion: CORE_QUESTIONS[0],
  answer: '先把眼前發生的事，和你對它形成的判斷分開來看。',
  plainLanguage: '先把眼前發生的事，和心裡對它的解釋分開；這樣比較不會被一個念頭綁住。',
  reflectionQuestion: '這件事中，哪些是你親眼看見的？哪些是你後來的解讀？',
};

const banned = ['你其實', '你真正想要', '你應該', '你必須', '命中注定', '一定會', '診斷', '創傷'];
const valid = (value: unknown, min: number, max: number) => typeof value === 'string' && value.trim().length >= min && Array.from(value.trim()).length <= max && !banned.some(word => value.includes(word));

export const coreAnswerFallback = (lens: CoreLens = 'diamond_sutra'): CoreAnswer => ({ ...FALLBACK, lens });

export const coreAnswerRole = {
  create(source: CoreAnswerSource): GeminiRoleRequest<CoreAnswerSource> {
    const context = source.recentContext?.filter(Boolean).slice(-3).join('\n') || '';
    const lensInstructions = source.preferredLens === 'i_ching'
      ? '易經只觀察局勢、變化、時機與可調整的互動；不占卜、不預言，不使用佛教術語，也不使用能量、氣場、流動、天氣等詩意比喻。'
      : '金剛經使用破四相、分開念頭與事實、應無所住而生其心、法尚應捨，協助鬆開固定認定，但不把 AI 回答當成最後答案。';
    return {
      timeoutMs: 15_000,
      context: source,
      payload: {
        model: FLASH_LITE_MODEL,
        contents: [{ role: 'user', parts: [{ text: `使用者剛才留下的文字：\n「${source.content}」\n${context ? `\n同一次對話的前文：\n${context}` : ''}` }] }],
        systemInstruction: { parts: [{ text: `你是思緒停靠的核心問題 Companion。請從以下固定核心問題中選一個最適合的，並使用指定的閱讀視角回答。只輸出 JSON。

指定閱讀視角：${source.preferredLens === 'i_ching' ? '易經' : '金剛經'}

固定核心問題（只用來選擇切入點，不要原樣重複在回答開頭）：
${CORE_QUESTIONS.map((question, index) => `${index + 1}. ${question}`).join('\n')}

規則：
1. ${lensInstructions}
2. 直接回答，不要開場客套、不要解釋你是 AI、不要重複使用者問題，也不要說「以下將從四個面向分析」。
3. answer 控制在 140–480 個中文字，使用 2–3 個短小標題與換行；金剛經可使用「破四相」「應無所住而生其心」「法尚應捨」，易經可使用「眼前局勢」「變化」「可調整之處」。
4. 先承認眼前發生的事，再指出哪些仍未知；不可把一次事件擴大成關係或人格結論。
5. 家庭或人際衝突中，可以提出理解方向，但只能用「可能、也許、看起來」；不可把任何動機或情緒寫成確定事實。
6. 必須附上簡短白話說明；不用堆砌經文，不用說教。
7. 不診斷、不預言、不替使用者決定、不命令，不使用「你其實」或「你真正想要」。
8. 不提供具體生活指令，例如遞水、眼神交流或一定要怎麼做；只提出可自行選擇的方向。
9. reflectionQuestion 只留一個具體、開放、可跳過的問題。
10. 輸出欄位：lens、coreQuestion、answer、plainLanguage、reflectionQuestion。lens 必須符合指定閱讀視角。` }] },
        generationConfig: {
          temperature: 0.15,
          maxOutputTokens: 520,
          thinkingConfig: FAST_THINKING_CONFIG,
          responseMimeType: 'application/json',
          responseSchema: { type: 'OBJECT', properties: { lens: { type: 'STRING', enum: ['diamond_sutra', 'i_ching'] }, coreQuestion: { type: 'STRING' }, answer: { type: 'STRING' }, plainLanguage: { type: 'STRING' }, reflectionQuestion: { type: 'STRING' } }, required: ['lens', 'coreQuestion', 'answer', 'plainLanguage', 'reflectionQuestion'] }
        }
      }
    };
  },
  read(raw: string): CoreAnswer | null {
    try {
      const value = JSON.parse(normalizeCompanionResponse(raw)) as Partial<CoreAnswer>;
      if ((value.lens !== 'diamond_sutra' && value.lens !== 'i_ching') || !CORE_QUESTIONS.includes(value.coreQuestion as never)) return null;
      if (!valid(value.answer, 60, 520) || !valid(value.plainLanguage, 12, 180) || !valid(value.reflectionQuestion, 8, 60)) return null;
      const combined = `${value.answer || ''}${value.plainLanguage || ''}${value.reflectionQuestion || ''}`;
      if (value.lens === 'i_ching' && ['法尚應捨', '應無所住', '破四相', '能量', '氣場', '天氣'].some(word => combined.includes(word))) return null;
      if ((value.reflectionQuestion!.match(/[？?]/gu) || []).length !== 1) return null;
      return { lens: value.lens, coreQuestion: value.coreQuestion!, answer: value.answer!.trim(), plainLanguage: value.plainLanguage!.trim(), reflectionQuestion: value.reflectionQuestion!.trim() };
    } catch { return null; }
  }
};
