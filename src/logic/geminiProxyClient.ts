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

export interface ThreadReflection {
  insight: string;
  sourcePhrases: [string, string];
  invitation: string;
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

  /** A short, contextual reply for the Rosebud Lite experiment. No diagnosis or advice. */
  public static async getCompanionResponse(current: string, memories: Array<{ date: string; content: string }>): Promise<string> {
    const fallback = memories.length > 0
      ? '我記得這件事曾以另一種方式出現過。想接著說，或先放在這裡都可以。'
      : '我先記在這裡。想接著說，或先放在這裡都可以。';
    const proxyUrl = this.getProxyUrl();
    const apiKey = this.getApiKey();
    if (!proxyUrl && !apiKey) return fallback;
    const memoryText = memories.map(item => `${item.date}｜${item.content}`).join('\n');
    const payload = {
      model: GEMINI_MODEL,
      contents: [{ role: 'user', parts: [{ text: `最新內容：\n${current}\n\n可能相關的過去片段：\n${memoryText || '無'}\n\n請以繁體中文回覆一句至兩句、最多60字。像一個安靜但記得脈絡的人。若過去片段確實相關，可自然提起一個具體片段；若不確定，完全不要提過去。禁止診斷、心理標籤、建議、命令、空泛安慰、聲稱知道使用者真正的原因。結尾可以讓使用者選擇接著說或先放著。` }] }],
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

  /** User-invoked only: finds one evidence-led change or relationship across a whole timeline. */
  public static async getThreadReflection(entries: Array<{ date: string; content: string }>): Promise<ThreadReflection | null> {
    if (entries.length < 2) return null;
    const proxyUrl = this.getProxyUrl();
    const apiKey = this.getApiKey();
    if (!proxyUrl && !apiKey) return null;
    const timeline = entries.map(item => `${item.date}｜${item.content}`).join('\n');
    const responseSchema = {
      type: 'OBJECT',
      properties: {
        insight: { type: 'STRING', description: '60 到 130 字的繁體中文新角度，指出兩段原文之間的問題轉折或關係' },
        sourcePhrases: { type: 'ARRAY', items: { type: 'STRING' }, minItems: 2, maxItems: 2, description: '從不同原文片段逐字複製的兩段依據' },
        invitation: { type: 'STRING', description: '一句繁體中文的開放式續寫提問，不超過 55 字' }
      },
      required: ['insight', 'sourcePhrases', 'invitation']
    };
    const payload = {
      model: REFLECTION_MODEL,
      contents: [{ role: 'user', parts: [{ text: `時間流：\n${timeline}\n\n回傳一個「新的觀看角度」與一個可續寫的問題。\n- insight：2 句內、60～130 字。指出兩段原文之間焦點如何轉移，並說明這使同一件事有何不同；不可逐句摘要、分類或講文字邏輯。\n- invitation：一句開放問題，圍繞原文具體字詞；不可給建議、催促或假定答案。\n- sourcePhrases：從兩個不同原文逐字複製。\n\n只根據原文；不可猜測心理、動機、人格或真正原因。禁止「第一句、第二句、客觀現況、時間稀缺性、推導、認知、邏輯、具體行動、你其實、你在、這顯示、壓力、恐懼、焦慮、自我懷疑、建議」。原文出現的詞可以直接引用，不可把它變成標籤。\n\n沒有可靠角度時回傳 {"insight":"","sourcePhrases":[],"invitation":""}。` }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 130, responseMimeType: 'application/json', responseSchema, thinkingConfig: FAST_THINKING_CONFIG }
    };
    try {
      const response = await postJsonWithTimeout(proxyUrl || `https://generativelanguage.googleapis.com/v1beta/models/${REFLECTION_MODEL}:generateContent?key=${apiKey}`, payload, 8_000);
      if (!response.ok) return null;
      const data = await response.json();
      const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : null;
      const sourcePhrases = Array.isArray(parsed?.sourcePhrases) ? parsed.sourcePhrases.map((value: unknown) => typeof value === 'string' ? value.trim() : '') : [];
      const insight = typeof parsed?.insight === 'string' ? parsed.insight.trim() : '';
      const invitation = typeof parsed?.invitation === 'string' ? parsed.invitation.trim() : '';
      const forbidden = ['第一句', '第二句', '客觀現況', '時間稀缺性', '推導', '認知', '邏輯', '具體行動', '你其實', '你在', '這顯示', '壓力', '恐懼', '焦慮', '自我懷疑', '你應該', '建議你', '無力感', '內心掙扎'];
      const sourceText = entries.map(item => item.content).join('\n');
      const combined = `${insight} ${invitation}`;
      if (insight.length < 20 || insight.length > 180 || !/[？?]$/.test(invitation) || invitation.length > 70 || sourcePhrases.length !== 2 || sourcePhrases.some((phrase: string) => phrase.length < 2 || !sourceText.includes(phrase)) || forbidden.some(word => combined.includes(word))) return null;
      return { insight, sourcePhrases: [sourcePhrases[0], sourcePhrases[1]], invitation };
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
