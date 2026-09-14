import { FAST_THINKING_CONFIG, FLASH_LITE_MODEL, GeminiRoleRequest, normalizeCompanionResponse } from './shared';

export type PsychologyLens = 'teen' | 'adler' | 'cbt';
export interface PsychologyAnswerSource { content: string; recentContext?: string[]; preferredLens: PsychologyLens; }
interface BaseAnswer<L extends PsychologyLens> { lens: L; title: string; evidence: string; reflectionQuestion: string; }
export interface TeenAnswer extends BaseAnswer<'teen'> {
  developmentalTask: string;
  developmentContext: string;
  possibleNeed: string;
  whatIsStillUnknown: string;
  phraseToAvoid: string;
  lowPressureReply: string;
  lowPressureBridge: string;
}
export interface AdlerAnswer extends BaseAnswer<'adler'> {
  myTask: string;
  otherTask: string;
  possiblePurpose: string;
  boundaryAction: string;
}
export interface CbtAnswer extends BaseAnswer<'cbt'> {
  trigger: string;
  automaticThought: string;
  distortionType: string;
  evidenceFor: string;
  evidenceAgainst: string;
  balancedThought: string;
  smallExperiment: string;
}
export type PsychologyAnswer = TeenAnswer | AdlerAnswer | CbtAnswer;

const FIELDS: Record<PsychologyLens, readonly string[]> = {
  teen: ['developmentalTask', 'developmentContext', 'possibleNeed', 'whatIsStillUnknown', 'phraseToAvoid', 'lowPressureReply', 'lowPressureBridge'],
  adler: ['myTask', 'otherTask', 'possiblePurpose', 'boundaryAction'],
  cbt: ['trigger', 'automaticThought', 'distortionType', 'evidenceFor', 'evidenceAgainst', 'balancedThought', 'smallExperiment'],
};

const INSTRUCTIONS: Record<PsychologyLens, string> = {
  teen: `你使用發展心理學與發展腦科學，服務焦慮、不知如何回應青少年的父母。不要把叛逆直接定義為問題行為，也不要把所有衝突歸因於前額葉未成熟。developmentalTask 說明可能的發展任務；developmentContext 提供不帶道德評價的發展脈絡；possibleNeed 只能提出可能需求；whatIsStillUnknown 明確指出目前不能知道什麼；phraseToAvoid 給一句容易升高衝突的話；lowPressureReply 給一句短、不評判的回應；lowPressureBridge 提供一個可自行選擇的低壓連結方式，不固定推薦遞水果或長談。若涉及自傷、暴力、虐待、失聯或立即危險，不可淡化成正常青春期，應建議立即尋求可信任成人或當地緊急支援。`,
  adler: `你只使用阿德勒的課題分離與目的論觀察當下選擇。myTask 說明使用者能負責的部分；otherTask 說明屬於對方決定與承擔的部分；possiblePurpose 只能用「可能、也許」探索目前反應想保護或達成什麼，不得指控操控或扮演受害者；boundaryAction 提供一個尊重雙方的界線行動。不要挖童年、陰影或潛意識，也不要做 CBT 的證據辯論。`,
  cbt: `你只使用 CBT 的認知模型與可驗證實驗。trigger 描述具體觸發事件；automaticThought 摘出當下自動冒出的判斷；distortionType 從非黑即白、過度概括、讀心、災難化、個人化、情緒推理或證據不足中選最貼近的一種，資料不足可寫「目前無法判定」；evidenceFor 與 evidenceAgainst 分別列出支持與不支持該想法的現有資訊；balancedThought 產生不盲目樂觀的替代想法；smallExperiment 提供一個低風險、可觀察結果的小實驗。不要談放下、無我、順勢、課題分離或潛意識。`,
};

const LABELS: Record<PsychologyLens, string> = { teen: '青少年發展', adler: '阿德勒', cbt: 'CBT' };
const getRecentContext = (source: PsychologyAnswerSource) => source.recentContext?.filter(Boolean).slice(-3) || [];
const sanitize = (value: string) => value.replace(/[^\p{L}\p{N}]/gu, '').toLocaleLowerCase();
const validLength = (value: string, min: number, max: number) => {
  const length = Array.from(value.trim()).length;
  return length >= min && length <= max;
};

export const psychologyAnswerRole = {
  create(source: PsychologyAnswerSource): GeminiRoleRequest<PsychologyAnswerSource> {
    const targetLens = source.preferredLens;
    const fields = FIELDS[targetLens];
    const context = getRecentContext(source).join('\n');
    const properties = Object.fromEntries([
      ['lens', { type: 'STRING', enum: [targetLens] }],
      ['title', { type: 'STRING' }],
      ['evidence', { type: 'STRING' }],
      ['reflectionQuestion', { type: 'STRING' }],
      ...fields.map((field) => [field, { type: 'STRING' }]),
    ]);
    return {
      timeoutMs: 15_000,
      context: source,
      payload: {
        model: FLASH_LITE_MODEL,
        contents: [{ role: 'user', parts: [{ text: `使用者目前文字：\n「${source.content}」${context ? `\n\n最近對話前文：\n${context}` : ''}` }] }],
        systemInstruction: { parts: [{ text: `你是「轉念之間」的${LABELS[targetLens]}視角。只輸出符合 Schema 的 JSON，不要輸出 Markdown 包裝。\n\n${INSTRUCTIONS[targetLens]}\n\n共同規則：\n1. title 為 4–18 個中文字的動態標題，不使用學派名稱。\n2. evidence 從目前文字或最近 3 則前文逐字摘錄 2–32 個字，不拼接不同句子。\n3. 每個內容欄位使用 8–180 個中文字，直接對應 evidence，不重複同一句空泛安慰。\n4. reflectionQuestion 只提出一個可跳過的開放問題。\n5. 不診斷、不預言、不命令、不把假設寫成事實，不使用「你其實」「你真正想要」。\n6. 輸出欄位：lens、title、evidence、reflectionQuestion、${fields.join('、')}。` }] },
        generationConfig: {
          temperature: 0.15,
          maxOutputTokens: 3072,
          thinkingConfig: FAST_THINKING_CONFIG,
          responseMimeType: 'application/json',
          responseSchema: { type: 'OBJECT', properties, required: ['lens', 'title', 'evidence', 'reflectionQuestion', ...fields] },
        },
      },
    };
  },
  read(raw: string, source: PsychologyAnswerSource): PsychologyAnswer | null {
    let value: Record<string, unknown>;
    try { value = JSON.parse(normalizeCompanionResponse(raw)) as Record<string, unknown>; }
    catch { return null; }
    const lens = source.preferredLens;
    if (value.lens !== lens || typeof value.title !== 'string' || typeof value.evidence !== 'string' || typeof value.reflectionQuestion !== 'string') return null;
    if (!validLength(value.title, 4, 18) || !validLength(value.reflectionQuestion, 6, 100) || !/[？?]/u.test(value.reflectionQuestion)) return null;
    const evidence = value.evidence.trim();
    const normalizedEvidence = sanitize(evidence);
    const evidenceSources = [source.content, ...getRecentContext(source)].filter(Boolean).map(sanitize);
    if (!validLength(normalizedEvidence, 2, 32) || !evidenceSources.some((text) => text.includes(normalizedEvidence))) return null;
    for (const field of FIELDS[lens]) {
      if (typeof value[field] !== 'string' || !validLength(value[field] as string, 8, 180)) return null;
    }
    if ([value.title, value.reflectionQuestion, ...FIELDS[lens].map((field) => value[field])].some((text) => typeof text === 'string' && /你其實|你真正想要/u.test(text))) return null;
    return { ...value, lens, title: value.title.trim(), evidence, reflectionQuestion: value.reflectionQuestion.trim() } as PsychologyAnswer;
  },
};
