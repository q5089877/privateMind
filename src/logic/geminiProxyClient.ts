/**
 * Gemini Client (支援 Cloudflare Proxy 與直連 Google API 雙模)
 */

export interface RoutedThought {
  category: '待辦事項' | '靈感創意' | '心情隨筆' | '知識備忘' | '碎屑雜訊';
  sub_tags: string[];
  summary: string;
  action_items: string[];
  priority: number;
  status_hint: string;
}

export class GeminiProxyClient {
  private static getProxyUrl(): string {
    return (
      localStorage.getItem('CLOUDFLARE_WORKER_URL') ||
      import.meta.env.VITE_CLOUDFLARE_WORKER_URL ||
      ''
    );
  }

  private static getApiKey(): string {
    return (
      localStorage.getItem('GEMINI_API_KEY') ||
      import.meta.env.VITE_GEMINI_API_KEY ||
      ''
    );
  }

  /**
   * 檢查是否有可用的 Proxy 或 API Key
   */
  public static isConfigured(): boolean {
    return !!(this.getProxyUrl().trim() || this.getApiKey().trim());
  }

  /**
   * 【思緒停靠 Mind Harbor V7.2】生成 0～3 句近/中/遠焦距句子起手式
   */
  public static async getPerspectiveStemsAsync(rawInput: string): Promise<string[]> {
    const cleanText = rawInput.trim();
    if (!cleanText) return [];

    const proxyUrl = this.getProxyUrl();
    const apiKey = this.getApiKey();

    if (!proxyUrl && !apiKey) {
      console.warn('[GeminiProxyClient] 未設定 Worker URL 或 API Key，略過 AI 生成。');
      return [];
    }

    const systemInstruction = {
      parts: [
        {
          text: `你是「思緒停靠 (Mind Harbor)」的句子起手式生成引擎。
你的唯一任務：根據使用者當前寫下的思緒文字（無論長短，例如「今天有點累」、「學生開始怕了」、「有件事讓我在意」），精準提供 3 句可接續書寫的「句子起手式」（依序為近/中/遠焦距，均以『……』結尾）。

【三個固定焦距定義（依序輸出 3 句）】
1. 近｜特寫鏡頭：聚焦具體瞬間、動作、一句話、身體感受或摩擦點。不追究深層原因。
   範例：最讓我不舒服的，其實是…… / 如果只看剛才發生的那一瞬間…… / 剛才空氣安靜的那一秒……
2. 中｜撥開旁人：拿掉別人的期待、外界規則與他人反應，回到使用者自己的位置。
   範例：如果不去管別人怎麼想，我其實…… / 拿掉這件事的規則，我最想要的是…… / 拋開應該怎樣，我真實的想法是……
3. 遠｜縮小放大：拉開時間跨度、縮小範圍、只看眼前一小段、允許暫時無解或不處理。
   範例：如果只看眼前這一段，我想…… / 如果不急著想答案，我現在擔心的是…… / 如果把時間拉長到半年後……

【嚴格禁令】
- 嚴禁輸出問題或問號（禁止任何『？』）。
- 嚴禁心理分析、診斷、貼標籤（禁止「你其實是焦慮」）。
- 嚴禁安慰與雞湯（禁止「辛苦了」、「沒關係」、「明天會更好」）。
- 必須完整回傳 3 句起手式（依序為近/中/遠焦距）。`.trim()
        }
      ]
    };

    const responseSchema = {
      type: 'OBJECT',
      properties: {
        stems: {
          type: 'ARRAY',
          items: { type: 'STRING' },
          description: '依序為近、中、遠焦距的 3 句起手式（以『……』結尾）'
        }
      },
      required: ['stems']
    };

    const payload = {
      contents: [{ parts: [{ text: cleanText }] }],
      systemInstruction,
      generationConfig: {
        temperature: 0.3,
        responseMimeType: 'application/json',
        responseSchema
      }
    };

    try {
      let res: Response;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4500); // 4.5秒超時限制

      if (apiKey) {
        // 優先直連 (台灣本地 IP，0.4s 極速響應且無香港節點阻擋問題)
        const targetUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent`;
        res = await fetch(targetUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-goog-api-key': apiKey
          },
          body: JSON.stringify(payload),
          signal: controller.signal
        });
      } else if (proxyUrl) {
        // 走 Cloudflare Proxy
        res = await fetch(proxyUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'gemini-3.5-flash-lite',
            ...payload
          }),
          signal: controller.signal
        });
      } else {
        clearTimeout(timeoutId);
        return [];
      }

      clearTimeout(timeoutId);

      if (!res.ok) {
        console.warn(`[GeminiProxyClient] API 回應錯誤: ${res.status} ${res.statusText}`);
        return [];
      }

      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) return [];

      const parsed = JSON.parse(text);
      return Array.isArray(parsed.stems) ? parsed.stems : [];
    } catch (err) {
      console.warn('[GeminiProxyClient] 呼叫逾時或失敗:', err);
      return [];
    }
  }

  /**
   * 【思緒分流器 Universal Thought Router】大眾通用五大分類與行動萃取
   */
  public static async routeThoughtAsync(rawInput: string): Promise<RoutedThought | null> {
    const cleanText = rawInput.trim();
    if (!cleanText) return null;

    const proxyUrl = this.getProxyUrl();
    const apiKey = this.getApiKey();

    if (!proxyUrl && !apiKey) {
      console.warn('[GeminiProxyClient] 未設定 Worker URL 或 API Key。');
      return null;
    }

    const systemInstruction = {
      parts: [
        {
          text: `你是一個大眾通用思緒分流引擎。你的任務是精準解構使用者的日常雜記、工作待辦、情緒碎念與靈感。

【分類邊界仲裁規則】
1. 複合型輸入（含有具體截止與行動者）：優先判定為【待辦事項】。
2. 無行動意圖的情緒宣洩：判定為【心情隨筆】，action_items 強制為空陣列 []。
3. 點子 vs 待辦：尚未確定執行方案的願景為【靈感創意】；具備時程為【待辦事項】。
4. 資訊記錄為【知識備忘】。

【優先等級 (Priority 1~5) 定標】
- 5：今日截止、緊急財務/健康危機、高影響力核心阻斷。
- 4：本週內需處理、重要專案節點。
- 3：一般常規待辦、無立即懲罰的事項。
- 2：值得保留的靈感、未定時程的待辦。
- 1：純心情宣洩、隨筆碎念、雜訊。

【約束】
- 語氣保持冷靜客觀，嚴禁說教與強制加雞湯。
- action_items 必須具體可執行，勿寫模糊空話。`.trim()
        }
      ]
    };

    const responseSchema = {
      type: 'OBJECT',
      properties: {
        category: {
          type: 'STRING',
          enum: ['待辦事項', '靈感創意', '心情隨筆', '知識備忘', '碎屑雜訊']
        },
        sub_tags: {
          type: 'ARRAY',
          items: { type: 'STRING' }
        },
        summary: { type: 'STRING' },
        action_items: {
          type: 'ARRAY',
          items: { type: 'STRING' }
        },
        priority: { type: 'INTEGER' },
        status_hint: { type: 'STRING' }
      },
      required: ['category', 'sub_tags', 'summary', 'action_items', 'priority', 'status_hint']
    };

    const payload = {
      contents: [{ parts: [{ text: cleanText }] }],
      systemInstruction,
      generationConfig: {
        temperature: 0.15,
        responseMimeType: 'application/json',
        responseSchema
      }
    };

    try {
      let res: Response;
      if (proxyUrl) {
        res = await fetch(proxyUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'gemini-3.5-flash-lite',
            ...payload
          })
        });
      } else {
        const targetUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent`;
        res = await fetch(targetUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-goog-api-key': apiKey
          },
          body: JSON.stringify(payload)
        });
      }

      if (!res.ok) {
        console.error(`[GeminiProxyClient] 分流回應錯誤: ${res.status} ${res.statusText}`);
        return null;
      }

      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) return null;

      return JSON.parse(text) as RoutedThought;
    } catch (err) {
      console.error('[GeminiProxyClient] 分流呼叫失敗:', err);
      return null;
    }
  }
}
