/**
 * Gemini Client (支援 Cloudflare Proxy 與直連 Google API 雙模)
 * Mind Harbor Dynamic Prompt Engine v3 - Thought Operations
 */

export interface ThoughtOperation {
  type: 'isolate' | 'contrast' | 'zoom_out' | 'landing' | 'reframe';
  label: string;         // 操作卡片標題/摘要 (例如: "🔍 隔離看：關於『身體很累』")
  actionPrompt: string;  // 點擊後帶入輸入框的起手文字 (例如: "如果先不看工作，我身體真正的感覺是……")
}

export interface PileAnalysis {
  labels: Record<string, string>;
  observations: string[];
}

/** Accept both plain Gemini text and the JSON wrapper returned by older Worker settings. */
export const normalizeCompanionResponse = (value: string): string => {
  const text = value.trim();
  try {
    const parsed = JSON.parse(text);
    if (typeof parsed?.response === 'string') return parsed.response.trim();
    if (typeof parsed?.text === 'string') return parsed.text.trim();
    if (typeof parsed?.reading === 'string') return parsed.reading.trim();
  } catch { /* Plain text is the expected shape. */ }
  return text;
};

const GEMINI_MODEL = 'gemini-3.6-flash';

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
      generationConfig: { temperature: 0.45, maxOutputTokens: 110, responseMimeType: 'text/plain' }
    };
    try {
      const response = proxyUrl
        ? await fetch(proxyUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        : await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!response.ok) return fallback;
      const data = await response.json();
      const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      const text = typeof raw === 'string' ? normalizeCompanionResponse(raw) : '';
      return text && text.length <= 140 ? text : fallback;
    } catch {
      return fallback;
    }
  }

  /** User-invoked only: reads one visible storyline and returns a short evidence-led reflection. */
  public static async getStorylineAnalysis(entries: Array<{ date: string; content: string }>): Promise<string> {
    const fallback = '這段內容還在發展。先把它留在時間流裡，也許之後會更看得清楚。';
    const proxyUrl = this.getProxyUrl();
    const apiKey = this.getApiKey();
    if (!proxyUrl && !apiKey) return fallback;
    const timeline = entries.map(item => `${item.date}｜${item.content}`).join('\n');
    const payload = {
      model: GEMINI_MODEL,
      contents: [{ role: 'user', parts: [{ text: `以下是使用者主動選擇要一起看的時間流：\n${timeline}\n\n你的任務不是摘要、重述時間順序、或把使用者剛看完的話換句話說。請找出原文中「被混在一起，因而讓人卡住」的 2 至 3 個不同問題、拉扯或層次。\n\n每個項目都必須：\n- 有一個 8 字內、具體的短標題\n- 說明它和另一個問題為何不同\n- 引用使用者一小段原文作為依據（12字內）\n\n最後只留一個問題：請使用者選擇目前最想先看哪一個項目。\n\n嚴格禁止：依日期重述、空泛的「你似乎／呈現出／正在經歷」、心理診斷、人格標籤、建議行動、替使用者判定真正原因、安慰語、或「這不是結論」等免責句。\n\n格式固定如下，總長不超過 220 字：\n\n混在一起的事\n1. 【短標題】說明\n   依據：「原文」\n2. 【短標題】說明\n   依據：「原文」\n\n現在最想先看哪一個？` }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 180, responseMimeType: 'text/plain' }
    };
    try {
      const response = proxyUrl
        ? await fetch(proxyUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        : await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!response.ok) return fallback;
      const data = await response.json();
      const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      const text = typeof raw === 'string' ? normalizeCompanionResponse(raw) : '';
      return text && text.length <= 260 ? text : fallback;
    } catch { return fallback; }
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
根據使用者當前寫下的思緒或分堆內容，進行最小必要結構理解（識別張力點、混雜層次、未解節點），生成 2～4 個具體的「思維操作卡片（Thought Operations）」。

【操作類型 (Type)】
1. isolate (隔離)：將某個具體焦點單獨拆開看，降低認知負荷。
2. contrast (對照)：將兩個看似拉扯/矛盾的具體事項並排看，促使價值排序。
3. zoom_out (抽離)：將時間軸拉長至三個月或一年後，淡化當下情緒摩擦。
4. landing (著陸)：聚焦在今天或此刻最微小、可直接放下的一步。
5. reframe (重構)：抽離外界標準與自我評判，回歸純粹個人感受。

【嚴格約束】
1. 【嚴禁心理診斷與解釋】：絕對禁止出現「你在焦慮…」、「這代表你…」、「這顯示出…」、「你可能…」。
2. 【嚴禁說教與問句】：卡片標籤 (label) 必須是「動作指令/角度提示」，禁止問號（？）。
3. 【緊扣原文關鍵詞】：操作必須直接引用使用者寫下的核心字詞，禁止空泛套話。
4. 【起手文字 (actionPrompt)】：點選後帶入的句子骨架，句末必須以「……」結尾，留給使用者自行書寫。
5. 【真實自然】：若內容極短或無可操作點，允許回傳空陣列。`.trim()
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
                enum: ['isolate', 'contrast', 'zoom_out', 'landing', 'reframe']
              },
              label: {
                type: 'STRING',
                description: '操作卡片短標籤，如「只看『身體很累』」、「把『薪水』與『同事』並排」'
              },
              actionPrompt: {
                type: 'STRING',
                description: '帶入輸入框的起手文字，如「如果先不考慮工作，我身體最直接的感覺是……」'
              }
            },
            required: ['type', 'label', 'actionPrompt']
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

      // 本地嚴格過濾（消除解釋性字眼與問號）
      const forbiddenKeywords = ['你在焦慮', '這顯示', '心理學', '你可能', '建議你', '請試著', '？', '?'];
      return parsed.operations
        .filter((op: any) => {
          if (!op.label || !op.actionPrompt) return false;
          const combined = `${op.label} ${op.actionPrompt}`;
          return !forbiddenKeywords.some((kw) => combined.includes(kw));
        })
        .map((op: any) => ({
          type: op.type,
          label: op.label.trim(),
          actionPrompt: op.actionPrompt.trim().endsWith('……')
            ? op.actionPrompt.trim()
            : `${op.actionPrompt.trim()}……`
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
