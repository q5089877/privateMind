import { FAST_THINKING_CONFIG, FLASH_LITE_MODEL, GeminiRoleRequest, normalizeCompanionResponse } from './shared';

export type CoreLens = 'diamond_sutra' | 'tao_te_ching';
export interface CoreAnswerSource { content: string; recentContext?: string[]; preferredLens?: CoreLens; }
export interface CoreAnswer { lens: CoreLens; title: string; quoteId: string; quote: string; evidence: string; coreQuestion: string; answer: string; plainLanguage: string; reflectionQuestion: string; }

export const CORE_QUESTIONS = [
  '我是不是把一個念頭當成了事實？',
  '我是不是把彼此的角色或立場，當成了對方的全部？',
  '哪些是眼前已經發生的事，哪些是我對過去或未來的推想？',
  '在不急著改變別人的前提下，我現在能做什麼？',
] as const;

const FALLBACK: CoreAnswer = {
  lens: 'diamond_sutra',
  title: '先把念頭放回原位',
  quoteId: 'diamond_non_attachment_01',
  quote: '凡所有相，皆是虛妄。若見諸相非相，即見如來。',
  evidence: '',
  coreQuestion: CORE_QUESTIONS[0],
  answer: '先把眼前發生的事，和你對它形成的判斷分開來看。',
  plainLanguage: '先把眼前發生的事，和心裡對它的解釋分開；這樣比較不會被一個念頭綁住。',
  reflectionQuestion: '這件事中，哪些是你親眼看見的？哪些是你後來的解讀？',
};

export const CORE_QUOTES: Record<CoreLens, readonly { id: string; text: string; useWhen: string }[]> = {
  diamond_sutra: [
    { id: 'diamond_non_attachment_01', text: '凡所有相，皆是虛妄。若見諸相非相，即見如來。', useWhen: '使用者把人、事情或自己的狀態固定成某種定論' },
    { id: 'diamond_non_abiding_01', text: '應無所住而生其心。', useWhen: '使用者卡在某個立場、結果或必須怎樣的想法' },
    { id: 'diamond_change_01', text: '一切有為法，如夢幻泡影，如露亦如電，應作如是觀。', useWhen: '使用者把當下的感受或事件延伸成永久的未來' },
  ],
  tao_te_ching: [
    { id: 'tao_water_01', text: '上善若水。水善利萬物而不爭。', useWhen: '使用者正在強力爭取、對抗或控制局面' },
    { id: 'tao_less_01', text: '為學日益，為道日損。損之又損，以至於無為。', useWhen: '使用者承擔太多、想同時處理所有事情' },
    { id: 'tao_self_knowledge_01', text: '知人者智，自知者明。', useWhen: '使用者把注意力全放在別人，還沒有看見自己的位置' },
  ],
};

const banned = ['你其實', '你真正想要', '你應該', '你必須', '命中注定', '一定會', '診斷', '創傷'];
const valid = (value: unknown, min: number, max: number) => typeof value === 'string' && value.trim().length >= min && Array.from(value.trim()).length <= max && !banned.some(word => value.includes(word));

export const coreAnswerFallback = (lens: CoreLens = 'diamond_sutra'): CoreAnswer => ({ ...FALLBACK, lens, quoteId: CORE_QUOTES[lens][0].id, quote: CORE_QUOTES[lens][0].text });

export const coreAnswerRole = {
  create(source: CoreAnswerSource): GeminiRoleRequest<CoreAnswerSource> {
    const context = source.recentContext?.filter(Boolean).slice(-3).join('\n') || '';
    const lensInstructions = source.preferredLens === 'tao_te_ching'
      ? '道德經只觀察事情中的用力、控制與留白；協助看見是否有不必急著推動的地方，以及可以如何順著現況保留空間。不把「無為」解釋成放棄，也不替使用者決定應該順從或退讓。不要改談念頭是否等於事實、情緒是否暫時或自我標籤。'
      : '金剛經使用破四相、分開念頭與事實、應無所住而生其心、法尚應捨，協助鬆開固定認定，但不把 AI 回答當成最後答案。不要改談控制力、順勢、留白或該不該放手。';
    return {
      timeoutMs: 15_000,
      context: source,
      payload: {
        model: FLASH_LITE_MODEL,
        contents: [{ role: 'user', parts: [{ text: `使用者剛才留下的文字：\n「${source.content}」\n${context ? `\n同一次對話的前文：\n${context}` : ''}` }] }],
        systemInstruction: { parts: [{ text: `你是「轉念之間」的核心問題 Companion。請從以下固定核心問題中選一個最適合的，並使用指定的閱讀視角回答。只輸出 JSON。

指定閱讀視角：${source.preferredLens === 'tao_te_ching' ? '道德經' : '金剛經'}

固定核心問題（只用來選擇切入點，不要原樣重複在回答開頭）：
${CORE_QUESTIONS.map((question, index) => `${index + 1}. ${question}`).join('\n')}

規則：
1. ${lensInstructions}
2. 直接回答，不要開場客套、不要解釋你是 AI、不要重複使用者問題，也不要說「以下將從四個面向分析」。
3. answer 是「對應解說」，控制在 45–140 個中文字，必須直接解釋前面的 quote 如何對應使用者原文；不使用 Markdown 標題、不列長清單。金剛經聚焦念頭與事實，道德經聚焦用力、控制、留白與順勢。經典只作為回答依據，不要把道德經寫成命令或泛泛的人生格言。
4. 先承認眼前發生的事，再指出哪些仍未知；不可把一次事件擴大成關係或人格結論。
5. 家庭或人際衝突中，可以提出理解方向，但只能用「可能、也許、看起來」；不可把任何動機或情緒寫成確定事實，也不可暗示某一方才是需要改變的人。若使用「法尚應捨」，應以雙向且開放的說法呈現：女兒的反應方式、家長的溝通方式，以及彼此當下的互動，都可以留待之後重新看待。
6. 必須附上 25–70 個中文字的簡短白話說明；白話說明是給使用者先看的摘要，不得重述 answer。answer 必須補充「這個視角如何套用到使用者原文」的觀察依據，不能只是把白話說明寫長。不用說教。
7. 不診斷、不預言、不替使用者決定、不命令，不使用「你其實」或「你真正想要」。
8. 不提供具體生活指令，例如遞水、眼神交流或一定要怎麼做；只提出可自行選擇的方向。
9. reflectionQuestion 只留一個具體、開放、可跳過的問題。
10. quoteId 必須根據使用者原文，從下列經文與適用情境中選出最符合的一句；不要總是選第一句：${CORE_QUOTES[source.preferredLens || 'diamond_sutra'].map((quote) => `${quote.id}：「${quote.text}」（${quote.useWhen}）`).join('、')}。程式會依 quoteId 顯示原文，不能自行輸出或改寫經文。
11. evidence 必須從使用者原文逐字摘錄 4–24 個中文字，作為完整分析的依據，不可自行改寫或捏造。
12. title 必須根據使用者原文與所選經文，產生 4–18 個中文字的短標題；不要使用「金剛經視角」「道德經視角」「核心回答」等固定標題，也不要使用 Markdown。
13. 輸出欄位：lens、title、quoteId、evidence、coreQuestion、answer、plainLanguage、reflectionQuestion。lens 必須符合指定閱讀視角。` }] },
        generationConfig: {
          temperature: 0.15,
          // 回答本身仍受 80–180 字限制；這裡保留足夠空間讓完整 JSON 不被截斷。
          maxOutputTokens: 520,
          thinkingConfig: FAST_THINKING_CONFIG,
          responseMimeType: 'application/json',
          responseSchema: { type: 'OBJECT', properties: { lens: { type: 'STRING', enum: ['diamond_sutra', 'tao_te_ching'] }, title: { type: 'STRING' }, quoteId: { type: 'STRING', enum: [...CORE_QUOTES.diamond_sutra, ...CORE_QUOTES.tao_te_ching].map((quote) => quote.id) }, evidence: { type: 'STRING' }, coreQuestion: { type: 'STRING' }, answer: { type: 'STRING' }, plainLanguage: { type: 'STRING' }, reflectionQuestion: { type: 'STRING' } }, required: ['lens', 'title', 'quoteId', 'evidence', 'coreQuestion', 'answer', 'plainLanguage', 'reflectionQuestion'] }
        }
      }
    };
  },
  read(raw: string, sourceContent = ''): CoreAnswer | null {
    try {
      const value = JSON.parse(normalizeCompanionResponse(raw)) as Partial<CoreAnswer>;
      const quote = value.lens !== 'diamond_sutra' && value.lens !== 'tao_te_ching' ? null : CORE_QUOTES[value.lens].find((item) => item.id === value.quoteId);
      if (!quote || !CORE_QUESTIONS.includes(value.coreQuestion as never)) return null;
      const title = value.title?.trim() || '';
      if (!valid(title, 4, 18) || ['金剛經視角', '道德經視角', '核心回答'].includes(title)) return null;
      const evidence = value.evidence?.trim() || '';
      const compactSource = sourceContent.replace(/[\s，。！？、；：：“”「」『』（）()]/gu, '');
      const compactEvidence = evidence.replace(/[\s，。！？、；：：“”「」『』（）()]/gu, '');
      if (Array.from(evidence).length < 4 || Array.from(evidence).length > 24 || !compactEvidence || !compactSource.includes(compactEvidence)) return null;
      if (!valid(value.answer, 30, 160) || !valid(value.plainLanguage, 12, 70) || !valid(value.reflectionQuestion, 8, 60)) return null;
      const compactAnswer = value.answer!.replace(/[\s，。！？、；：：“”「」『』（）()]/gu, '');
      const compactPlainLanguage = value.plainLanguage!.replace(/[\s，。！？、；：：“”「」『』（）()]/gu, '');
      if (compactAnswer === compactPlainLanguage) return null;
      const combined = `${value.answer || ''}${value.plainLanguage || ''}${value.reflectionQuestion || ''}`;
      if ((value.reflectionQuestion!.match(/[？?]/gu) || []).length !== 1) return null;
      return { lens: value.lens, title, quoteId: quote.id, quote: quote.text, evidence, coreQuestion: value.coreQuestion!, answer: value.answer!.trim(), plainLanguage: value.plainLanguage!.trim(), reflectionQuestion: value.reflectionQuestion!.trim() };
    } catch { return null; }
  }
};
