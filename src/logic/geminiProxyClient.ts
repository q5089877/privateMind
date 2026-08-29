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
你的唯一任務：深入融入使用者當下寫下的思緒情境（例如：「好想睡覺」、「學生開始怕了」、「今天有點累」），精準提供 3 句「深度呼應當前語境、口語自然、無說教、以『……』結尾」的句子起手式，幫助使用者接著把話寫完。

【三個固定焦距定義（依序輸出 3 句，起手式必須與使用者的具體內容緊密相連，嚴禁輸出機械空泛的公版套話）】
1. 近｜特寫鏡頭（聚焦當下身體感受、具體瞬間、當前動作）：
   - 使用者寫「好想睡覺」 $\rightarrow$ 此刻身體和眼皮最沉重的地方是…… / 如果現在直接閉上眼睛……
   - 使用者寫「學生開始怕了」 $\rightarrow$ 剛才看見學生眼神變化的那一刻…… / 空氣突然安靜下來的那一秒……
   - 使用者寫「今天有點累」 $\rightarrow$ 最先感覺到透支的瞬間是…… / 當下身體最想放鬆的部位是……
2. 中｜撥開旁人（拿掉別人的期待、外界規則、他人眼光，回到自己真實的感受）：
   - 使用者寫「好想睡覺」 $\rightarrow$ 如果不管今天還剩下什麼事沒做…… / 如果不勉強自己非得撐著……
   - 使用者寫「學生開始怕了」 $\rightarrow$ 拋開老師或長輩的包袱，我心裡其實…… / 如果不急著維持威嚴……
   - 使用者寫「今天有點累」 $\rightarrow$ 如果不急著滿足別人的要求，我現在最想……
3. 遠｜縮小放大（允許停留在這裡、縮小處理範圍、時間拉長、暫時無解）：
   - 使用者寫「好想睡覺」 $\rightarrow$ 今天就先停在這裡，剩下的…… / 先好好睡一覺，醒來再……
   - 使用者寫「學生開始怕了」 $\rightarrow$ 如果只看眼前能慢慢溝通的一小步…… / 允許這段關係暫時需要時間……
   - 使用者寫「今天有點累」 $\rightarrow$ 允許今天到這裡就好，剩下的明天……

【嚴格約束】
- 語意必須「緊扣使用者輸入的具體字詞與情境」，絕不可回傳生硬套版的空話。
- 嚴禁出現問號『？』，嚴禁心理分析/診斷，嚴禁安慰雞湯。
- 輸出必須為 3 句起手式（依序為近/中/遠焦距），每句以『……』結尾。`.trim()
        }
      ]
    };

    const responseSchema = {
      type: 'OBJECT',
      properties: {
        stems: {
          type: 'ARRAY',
          items: { type: 'STRING' },
          description: '依序為近、中、遠焦距的 3 句起手式（緊扣使用者語境，以『……』結尾）'
        }
      },
      required: ['stems']
    };

    const payload = {
      contents: [{ parts: [{ text: cleanText }] }],
      systemInstruction,
      generationConfig: {
        temperature: 0.45,
        responseMimeType: 'application/json',
        responseSchema
      }
    };

    try {
      let res: Response;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000); // 6秒超時保護

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
