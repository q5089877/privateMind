/**
 * Gemini Client (支援 Cloudflare Proxy 與直連 Google API 雙模)
 * Mind Harbor Dynamic Prompt Engine v3 - Thought Operations
 */

export interface ThoughtOperation {
  type: 'isolate' | 'contrast' | 'zoom_out' | 'landing';
  label: string;         // 操作卡片標題/摘要 (例如: "先只看『身體很累』")
  actionPrompt: string;  // 點擊後帶入輸入框的起手文字 (例如: "如果先不看工作，我身體真正的感覺是……")
  sourcePhrases: string[]; // 必須逐字出現在使用者原文，作為卡片的落點
}

export interface PileAnalysis {
  labels: Record<string, string>;
  observations: string[];
}

export interface ThreadReflectionLens {
  title: string;
  sourcePhrase: string;
}

export interface ThreadReflection {
  lenses: [ThreadReflectionLens, ThreadReflectionLens];
}

export interface TimelineInsight {
  evidence: Array<{ date: string; phrase: string }>;
  angle: string;
  question: string;
}

export interface DiscoveryInsight extends TimelineInsight {
  momentIds: string[];
}

/** Accept both plain Gemini text and the JSON wrapper returned by older Worker settings. */
export const normalizeCompanionResponse = (value: string): string => {
  const text = value.trim().replace(/^```(?:json)?\s*|\s*```$/g, '');
  try {
    const parsed = JSON.parse(text);
    if (typeof parsed?.response === 'string') return parsed.response.trim();
    if (typeof parsed?.text === 'string') return parsed.text.trim();
    if (typeof parsed?.reading === 'string') return parsed.reading.trim();
    // Some Gemini responses still wrap plain text even when text/plain is requested.
    if (typeof parsed?.content === 'string') return parsed.content.trim();
    if (typeof parsed?.message === 'string') return parsed.message.trim();
  } catch { /* Plain text is the expected shape. */ }
  return text;
};

// This interaction is deliberately lightweight. Flash-Lite keeps the UI responsive
// while still returning a text reflection based only on the visible timeline.
const GEMINI_MODEL = 'gemini-3.5-flash-lite';
const REFLECTION_MODEL = 'gemini-3.5-flash';
const FAST_THINKING_CONFIG = { thinkingLevel: 'minimal' };

const postJsonWithTimeout = async (url: string, payload: unknown, timeoutMs: number): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: controller.signal });
  } finally {
    window.clearTimeout(timeoutId);
  }
};

export class GeminiProxyClient {
  private static getProxyUrl(): string {
    try {
      return (
        (typeof localStorage !== 'undefined' ? localStorage.getItem('CLOUDFLARE_WORKER_URL') : null) ||
        (typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_CLOUDFLARE_WORKER_URL : null) ||
        'https://raspy-bush-9ab5.q5089877.workers.dev'
      );
    } catch {
      return '';
    }
  }

  private static getApiKey(): string {
    try {
      return (
        (typeof localStorage !== 'undefined' ? localStorage.getItem('GEMINI_API_KEY') : null) ||
        (typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_GEMINI_API_KEY : null) ||
        ''
      );
    } catch {
      return '';
    }
  }

  public static isConfigured(): boolean {
    return !!(this.getProxyUrl().trim() || this.getApiKey().trim());
  }

  /** A present-tense reply. It must never retrieve or mention past Moments. */
  public static async getCompanionResponse(current: string): Promise<string> {
    const fallback = '這一刻先留在這裡。想接著說，或先停在這裡都可以。';
    const proxyUrl = this.getProxyUrl();
    const apiKey = this.getApiKey();
    if (!proxyUrl && !apiKey) return fallback;
    const payload = {
      model: GEMINI_MODEL,
      contents: [{ role: 'user', parts: [{ text: `使用者剛留下這一句：\n${current}\n\n請以繁體中文回覆兩到三句、最多72字。只根據這一句話，提供被接住的感覺與一個溫和、可選的新觀看角度。不得提及過去紀錄、記憶、模式、重複或任何你未看見的內容。禁止診斷、心理標籤、建議、命令、空泛安慰、聲稱知道真正原因。最後保留「不用現在想完」的餘地。` }] }],
      generationConfig: { temperature: 0.45, maxOutputTokens: 72, responseMimeType: 'text/plain', thinkingConfig: FAST_THINKING_CONFIG }
    };
    try {
      const response = await postJsonWithTimeout(proxyUrl || `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`, payload, 8_000);
      if (!response.ok) return fallback;
      const data = await response.json();
      const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      const text = typeof raw === 'string' ? normalizeCompanionResponse(raw) : '';
      return text && text.length <= 140 ? text : fallback;
    } catch {
      return fallback;
    }
  }

  /** User-invoked only: separates two visible directions without interpreting the person. */
  public static async getThreadReflection(entries: Array<{ date: string; content: string }>): Promise<ThreadReflection | null> {
    if (entries.length < 2) return null;
    const proxyUrl = this.getProxyUrl();
    const apiKey = this.getApiKey();
    if (!proxyUrl && !apiKey) return null;
    const timeline = entries.map(item => `${item.date}｜${item.content}`).join('\n');
    const responseSchema = {
      type: 'OBJECT',
      properties: {
        lenses: {
          type: 'ARRAY',
          minItems: 2,
          maxItems: 2,
          items: {
            type: 'OBJECT',
            properties: {
              title: { type: 'STRING', description: '2 到 8 字，只命名原文的一個具體方向' },
              sourcePhrase: { type: 'STRING', description: '從不同原文片段逐字複製的 2 到 16 字依據' }
            },
            required: ['title', 'sourcePhrase']
          }
        }
      },
      required: ['lenses']
    };
    const payload = {
      model: REFLECTION_MODEL,
      contents: [{ role: 'user', parts: [{ text: `時間流：\n${timeline}\n\n請只做一件事：從這些原文裡挑出兩個「不是同一件事」的具體方向，讓使用者自己選想先談哪個。\n\n每個方向只回傳：\n- title：2 到 8 字，使用日常語言命名，不可抽象、不可以是心理或人格標籤。\n- sourcePhrase：從不同原文片段逐字複製 2 到 16 字。\n\n不要解釋、摘要、下結論、給建議、提出問題，或補上原文沒有的背景。禁止使用：你、心理、系統性、生命歷程、壓力、恐懼、焦慮、逃避、動機、人格、原因、年紀、社會、時代、應該、建議、第一句、第二句。\n\n若無法穩妥地找出兩個不同方向，回傳 {"lenses":[]}。` }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 130, responseMimeType: 'application/json', responseSchema, thinkingConfig: FAST_THINKING_CONFIG }
    };
    try {
      const response = await postJsonWithTimeout(proxyUrl || `https://generativelanguage.googleapis.com/v1beta/models/${REFLECTION_MODEL}:generateContent?key=${apiKey}`, payload, 8_000);
      if (!response.ok) return null;
      const data = await response.json();
      const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : null;
      const lenses = Array.isArray(parsed?.lenses) ? parsed.lenses.map((lens: unknown) => {
        const item = lens as { title?: unknown; sourcePhrase?: unknown };
        return {
          title: typeof item?.title === 'string' ? item.title.trim() : '',
          sourcePhrase: typeof item?.sourcePhrase === 'string' ? item.sourcePhrase.trim() : ''
        };
      }) : [];
      const forbidden = ['你', '心理', '系統性', '生命歷程', '壓力', '恐懼', '焦慮', '逃避', '動機', '人格', '原因', '年紀', '社會', '時代', '應該', '建議', '第一句', '第二句'];
      const sourceText = entries.map(item => item.content).join('\n');
      if (lenses.length !== 2 || lenses.some(lens => lens.title.length < 2 || lens.title.length > 8 || lens.sourcePhrase.length < 2 || lens.sourcePhrase.length > 16 || !sourceText.includes(lens.sourcePhrase) || forbidden.some(word => lens.title.includes(word)))) return null;
      return { lenses: [lenses[0], lenses[1]] };
    } catch {
      return null;
    }
  }

  /**
   * A time-earned reading. The caller must first check count and date-span eligibility.
   * This returns one evidence-backed angle, not a diagnosis or a recommendation.
   */
  public static async getTimelineInsight(entries: Array<{ date: string; content: string }>): Promise<TimelineInsight | null> {
    if (entries.length < 3) return null;
    const proxyUrl = this.getProxyUrl();
    const apiKey = this.getApiKey();
    if (!proxyUrl && !apiKey) return null;
    const timeline = entries.map(item => `${item.date}｜${item.content}`).join('\n');
    const responseSchema = {
      type: 'OBJECT',
      properties: {
        evidence: {
          type: 'ARRAY', minItems: 2, maxItems: 4,
          items: {
            type: 'OBJECT', properties: {
              date: { type: 'STRING' },
              phrase: { type: 'STRING' }
            }, required: ['date', 'phrase']
          }
        },
        angle: { type: 'STRING' },
        question: { type: 'STRING' }
      },
      required: ['evidence', 'angle', 'question']
    };
    const payload = {
      model: REFLECTION_MODEL,
      contents: [{ role: 'user', parts: [{ text: `以下是同一條由使用者確認、且跨時間累積的原文：\n${timeline}\n\n請提供一個「使用者分開寫時不容易看見」的新角度。它只能指出原文可驗證的缺口、轉折、重複或不對稱，不能推論原因、心理狀態或給建議。\n\n回傳 JSON：\n- evidence：至少兩則日期與原文逐字片段，phrase 必須從該日期的內容逐字複製。\n- angle：40 到 90 字的具體觀察；必須建立在 evidence 上，不能只是按日期重述。\n- question：一個 16 到 42 字、讓人自己判斷的問題；不可要求行動、不可給二選一答案。\n\n禁止：你其實、你在、這顯示、因為、所以、心理、壓力、恐懼、焦慮、逃避、人格、診斷、建議、應該、一定、真正原因。` }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 260, responseMimeType: 'application/json', responseSchema, thinkingConfig: FAST_THINKING_CONFIG }
    };
    try {
      const response = await postJsonWithTimeout(proxyUrl || `https://generativelanguage.googleapis.com/v1beta/models/${REFLECTION_MODEL}:generateContent?key=${apiKey}`, payload, 8_000);
      if (!response.ok) return null;
      const data = await response.json();
      const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : null;
      const evidence = Array.isArray(parsed?.evidence) ? parsed.evidence.map((item: unknown) => {
        const value = item as { date?: unknown; phrase?: unknown };
        return { date: typeof value.date === 'string' ? value.date.trim() : '', phrase: typeof value.phrase === 'string' ? value.phrase.trim() : '' };
      }) : [];
      const angle = typeof parsed?.angle === 'string' ? parsed.angle.trim() : '';
      const question = typeof parsed?.question === 'string' ? parsed.question.trim() : '';
      const byDate = new Map(entries.map(entry => [entry.date, entry.content]));
      const forbidden = ['你其實', '你在', '這顯示', '因為', '所以', '心理', '壓力', '恐懼', '焦慮', '逃避', '人格', '診斷', '建議', '應該', '一定', '真正原因'];
      const bad = (value: string) => forbidden.some(word => value.includes(word));
      if (evidence.length < 2 || evidence.some(item => !item.date || !item.phrase || !byDate.get(item.date)?.includes(item.phrase)) || angle.length < 20 || angle.length > 120 || question.length < 8 || question.length > 64 || bad(angle) || bad(question)) return null;
      return { evidence, angle, question };
    } catch {
      return null;
    }
  }

  /** User-invoked only: find one evidence-backed line inside a recent master timeline. */
  public static async findDiscoveryInsight(entries: Array<{ id: string; createdAt: number; date: string; content: string }>): Promise<DiscoveryInsight | null> {
    if (entries.length < 3) return null;
    const proxyUrl = this.getProxyUrl();
    const apiKey = this.getApiKey();
    if (!proxyUrl && !apiKey) return null;
    const timeline = entries.map(item => `[${item.id}] ${item.date}｜${item.content}`).join('\n');
    const responseSchema = {
      type: 'OBJECT',
      properties: {
        momentIds: { type: 'ARRAY', maxItems: 5, items: { type: 'STRING' } },
        evidence: { type: 'ARRAY', maxItems: 4, items: { type: 'OBJECT', properties: { id: { type: 'STRING' }, phrase: { type: 'STRING' } }, required: ['id', 'phrase'] } },
        angle: { type: 'STRING' },
        question: { type: 'STRING' }
      },
      required: ['momentIds', 'evidence', 'angle', 'question']
    };
    const payload = {
      model: REFLECTION_MODEL,
      contents: [{ role: 'user', parts: [{ text: `以下是使用者近期、跨時間留下的原文。請找出一組最值得回看的 3 到 5 段，並直接提供一個新角度。\n\n${timeline}\n\n規則：\n1. 只能選跨至少兩個自然日、且第一筆與最後一筆相隔至少 24 小時的片段。\n2. 只指出原文可驗證的缺口、轉折、重複或不對稱；不要做摘要。\n3. 不推論原因、心理狀態或人格，不給建議。\n4. evidence 的 phrase 必須從該 id 的原文逐字複製。\n5. angle 為 40 到 90 字；question 為一個讓人自行判斷的問題。\n6. 禁止：你其實、你在、這顯示、因為、所以、心理、壓力、恐懼、焦慮、逃避、人格、診斷、建議、應該、一定、真正原因。\n若沒有可靠角度，回傳 momentIds: []、evidence: []、angle: ""、question: ""。` }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 320, responseMimeType: 'application/json', responseSchema, thinkingConfig: FAST_THINKING_CONFIG }
    };
    try {
      const response = await postJsonWithTimeout(proxyUrl || `https://generativelanguage.googleapis.com/v1beta/models/${REFLECTION_MODEL}:generateContent?key=${apiKey}`, payload, 12_000);
      if (!response.ok) return null;
      const data = await response.json();
      const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : null;
      const momentIds: string[] = Array.isArray(parsed?.momentIds) ? [...new Set<string>(parsed.momentIds.filter((id: unknown): id is string => typeof id === 'string'))] : [];
      const byId = new Map(entries.map(entry => [entry.id, entry]));
      const evidence: Array<{ id: string; date: string; phrase: string }> = Array.isArray(parsed?.evidence) ? parsed.evidence.map((item: unknown) => {
        const value = item as { id?: unknown; phrase?: unknown };
        const id = typeof value.id === 'string' ? value.id : '';
        return { id, date: byId.get(id)?.date || '', phrase: typeof value.phrase === 'string' ? value.phrase.trim() : '' };
      }) : [];
      const angle = typeof parsed?.angle === 'string' ? parsed.angle.trim() : '';
      const question = typeof parsed?.question === 'string' ? parsed.question.trim() : '';
      const selected = momentIds.map(id => byId.get(id)).filter((entry): entry is { id: string; createdAt: number; date: string; content: string } => Boolean(entry));
      const dates = new Set(selected.map(entry => new Date(entry.createdAt).toDateString()));
      const timestamps = selected.map(entry => entry.createdAt).filter(Number.isFinite);
      const span = timestamps.length ? Math.max(...timestamps) - Math.min(...timestamps) : 0;
      const forbidden = ['你其實', '你在', '這顯示', '因為', '所以', '心理', '壓力', '恐懼', '焦慮', '逃避', '人格', '診斷', '建議', '應該', '一定', '真正原因'];
      const bad = (value: string) => forbidden.some(word => value.includes(word));
      if (selected.length < 3 || dates.size < 2 || span < 24 * 60 * 60 * 1000 || evidence.length < 2 || evidence.some(item => !momentIds.includes(item.id) || !item.phrase || !byId.get(item.id)?.content.includes(item.phrase)) || angle.length < 20 || angle.length > 120 || question.length < 8 || question.length > 64 || bad(angle) || bad(question)) return null;
      return { momentIds, evidence: evidence.map(({ date, phrase }) => ({ date, phrase })), angle, question };
    } catch {
      return null;
    }
  }

  public static async analyzePilesAsync(piles: Array<{ id: string; items: string[] }>): Promise<PileAnalysis> {
    const usablePiles = piles.filter(pile => pile.items.length > 0);
    if (usablePiles.length < 2) return { labels: {}, observations: [] };
    const empty: PileAnalysis = { labels: {}, observations: [] };
    const proxyUrl = this.getProxyUrl();
    const apiKey = this.getApiKey();
    if (!proxyUrl && !apiKey) return empty;

    const payload = {
      model: GEMINI_MODEL,
      contents: [{ role: 'user', parts: [{ text: `以下是使用者自己分出的、尚未命名的思緒堆：\n${JSON.stringify(usablePiles)}\n\n請只根據每堆裡的原文，回傳 JSON：{"piles":[{"id":"...","label":"..."}],"observations":["..."]}。每堆給一個 2～8 字的暫時堆名；觀察最多兩句，只能描述已分出的堆之間明顯存在的結構。禁止診斷、揣測情緒或人格、給建議、使用問句、使用「你」。若沒有可靠觀察，observations 回傳空陣列。`.trim() }] }],
      generationConfig: { temperature: 0.2, responseMimeType: 'application/json' }
    };
    try {
      const response = proxyUrl
        ? await fetch(proxyUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        : await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!response.ok) return empty;
      const data = await response.json();
      const parsed = JSON.parse(data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}');
      const ids = new Set(usablePiles.map(pile => pile.id));
      const forbidden = ['你', '焦慮', '憂鬱', '心理', '應該', '建議', '?', '？'];
      const labels = Object.fromEntries((Array.isArray(parsed.piles) ? parsed.piles : [])
        .filter((pile: any) => ids.has(pile.id) && typeof pile.label === 'string' && pile.label.trim() && pile.label.trim().length <= 12)
        .map((pile: any) => [pile.id, pile.label.trim()]));
      const observations = (Array.isArray(parsed.observations) ? parsed.observations : [])
        .filter((item: unknown) => typeof item === 'string' && item.trim() && !forbidden.some(word => item.includes(word)))
        .slice(0, 2)
        .map((item: string) => item.trim());
      return { labels, observations };
    } catch {
      return empty;
    }
  }

  /**
   * 【Mind Harbor V7.2 → Dynamic Prompt Engine v3】
   * 生成結構化「思維操作動詞（Thought Operations）」
   *
   * 哲學原則：
   * 1. 結構提供者，而非解釋者（不診斷、不說「你在焦慮」、不下結論）
   * 2. 緊扣原文具體關鍵字，提供實質的思維槓桿（隔離、對照、拉遠、著陸）
   * 3. 允許 Graceful Silence（若無自然張力點則回傳 []）
   */
  public static async getThoughtOperationsAsync(
    contextText: string,
    traysContext?: Array<{ id: string; name?: string; items: string[] }>
  ): Promise<ThoughtOperation[]> {
    const cleanText = contextText.trim();
    if (!cleanText || cleanText.length < 1) return [];

    const proxyUrl = this.getProxyUrl();
    const apiKey = this.getApiKey();
    if (!proxyUrl && !apiKey) {
      console.warn('[GeminiProxyClient] 未設定 Worker URL 或 API Key，略過 AI 生成。');
      return [];
    }

    const systemInstruction = {
      parts: [
        {
          text: `你是「思緒停靠 (Mind Harbor)」的思維操作引擎（Cognitive Scaffold Engine）。

【任務】
根據使用者當前寫下的思緒，生成 2～4 個具體的「思維操作卡片（Thought Operations）」。你提供的是觀看角度，不是對使用者的理解或結論。

【操作類型 (Type)】
1. isolate (隔離)：將某個具體焦點單獨拆開看，降低認知負荷。
2. contrast (對照)：將兩個看似拉扯/矛盾的具體事項並排看，促使價值排序。
3. zoom_out (抽離)：將時間軸拉長至三個月或一年後，淡化當下情緒摩擦。
4. landing (著陸)：只邀請使用者選擇現在想先碰的一句。

【嚴格約束】
1. 【絕不解釋】：禁止心理診斷、動機推測或結論。禁止「這是」、「你其實」、「你在」、「這顯示」、「壓力」、「恐懼」、「焦慮」、「逃避」、「妥協」、「自我懷疑」。
2. 【只給操作】：label 必須是可做的觀看動作，不能有標題式分類、不能解釋、不能有問號。
3. 【逐字落在原文】：每張卡都要在 sourcePhrases 放入 1～2 段從原文逐字複製的片段；片段各為 2～16 字。label 或 actionPrompt 也必須包含至少一段該片段。
4. 【起手文字】：actionPrompt 是點選後的續寫骨架，句末必須是「……」，留白給使用者自行寫。
5. 【真實自然】：若內容太短或沒有自然的操作入口，回傳空陣列。`.trim()
        }
      ]
    };

    const responseSchema = {
      type: 'OBJECT',
      properties: {
        operations: {
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            properties: {
              type: {
                type: 'STRING',
                enum: ['isolate', 'contrast', 'zoom_out', 'landing']
              },
              label: {
                type: 'STRING',
                description: '操作卡片短標籤，如「只看『身體很累』」、「把『薪水』與『同事』並排」'
              },
              actionPrompt: {
                type: 'STRING',
                description: '帶入輸入框的起手文字，如「如果先不考慮工作，我身體最直接的感覺是……」'
              },
              sourcePhrases: {
                type: 'ARRAY',
                items: { type: 'STRING' },
                description: '從使用者原文逐字複製的 1～2 段片段'
              }
            },
            required: ['type', 'label', 'actionPrompt', 'sourcePhrases']
          },
          description: '生成 2～4 個結構化思維操作卡片'
        }
      },
      required: ['operations']
    };

    const payload = {
      model: GEMINI_MODEL,
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `使用者當前思緒：\n"""\n${cleanText}\n"""\n${
                traysContext && traysContext.length > 0
                  ? `\n托盤分堆狀態：\n${JSON.stringify(traysContext, null, 2)}`
                  : ''
              }`
            }
          ]
        }
      ],
      systemInstruction,
      generationConfig: {
        temperature: 0.3,
        topP: 0.85,
        responseMimeType: 'application/json',
        responseSchema
      }
    };

    try {
      let data: any;
      if (proxyUrl) {
        const response = await fetch(proxyUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!response.ok) throw new Error(`Proxy error: ${response.statusText}`);
        data = await response.json();
      } else {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!response.ok) throw new Error(`Gemini direct error: ${response.statusText}`);
        data = await response.json();
      }

      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) return [];

      const parsed = JSON.parse(text);
      if (!parsed?.operations || !Array.isArray(parsed.operations)) return [];

      // 本地嚴格過濾：不接受解釋式文字，並確認每張卡真的落在原文。
      const forbiddenKeywords = ['這是', '你其實', '你在', '這顯示', '心理學', '你可能', '建議你', '請試著', '壓力', '恐懼', '焦慮', '逃避', '妥協', '自我懷疑', '？', '?'];
      return parsed.operations
        .filter((op: any) => {
          if (!op.label || !op.actionPrompt || !Array.isArray(op.sourcePhrases)) return false;
          const combined = `${op.label} ${op.actionPrompt}`;
          const sourcePhrases = op.sourcePhrases
            .filter((phrase: unknown) => typeof phrase === 'string' && phrase.trim().length >= 2 && phrase.trim().length <= 16)
            .map((phrase: string) => phrase.trim());
          const usesSourcePhrase = sourcePhrases.some((phrase: string) => cleanText.includes(phrase) && combined.includes(phrase));
          return usesSourcePhrase && !forbiddenKeywords.some((kw) => combined.includes(kw));
        })
        .map((op: any) => ({
          type: op.type,
          label: op.label.trim(),
          actionPrompt: op.actionPrompt.trim().endsWith('……')
            ? op.actionPrompt.trim()
            : `${op.actionPrompt.trim()}……`,
          sourcePhrases: op.sourcePhrases.map((phrase: string) => phrase.trim())
        }));
    } catch (err) {
      console.warn('[GeminiProxyClient] 思維操作生成失敗:', err);
      return [];
    }
  }

  /**
   * 後向相容方法：將 ThoughtOperations 轉換為起手式字串陣列
   */
  public static async getPerspectiveStemsAsync(rawInput: string): Promise<string[]> {
    const ops = await this.getThoughtOperationsAsync(rawInput);
    return ops.map((op) => op.actionPrompt);
  }
}
