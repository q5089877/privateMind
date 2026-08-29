/**
 * Gemini Client (支援 Cloudflare Proxy 與直連 Google API 雙模)
 * Mind Harbor Perspective Engine v2
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

  public static isConfigured(): boolean {
    return !!(this.getProxyUrl().trim() || this.getApiKey().trim());
  }

  /**
   * 【思緒停靠 Mind Harbor V7.2 → Perspective Engine v2】
   * 生成 0～3 句自然句子起手式
   *
   * 設計原則：
   * 1. 候選池優先，不強制三焦距各一
   * 2. 允許 Graceful Silence（沒有自然入口就回傳 []）
   * 3. 最小必要理解，禁止把理解結果說出來
   * 4. 生成 ≠ 顯示，必須經過規則驗證
   */
  public static async getPerspectiveStemsAsync(rawInput: string): Promise<string[]> {
    const cleanText = rawInput.trim();
    if (!cleanText || cleanText.length < 2) return [];

    const proxyUrl = this.getProxyUrl();
    const apiKey = this.getApiKey();
    if (!proxyUrl && !apiKey) {
      console.warn('[GeminiProxyClient] 未設定 Worker URL 或 API Key，略過 AI 生成。');
      return [];
    }

    // ---------- Stage 1 + 2：最小必要理解 + 候選生成 ----------
    const systemInstruction = {
      parts: [
        {
          text: `你是「思緒停靠 (Mind Harbor)」的句子起手式引擎。

你的任務只有一件事：
根據使用者當下寫下的文字，產生「可以自然接著寫下去」的句子起手式。

【核心原則】
1. 只做最小必要理解，絕不要把理解結果說出來。
2. 不要分析、不要診斷、不要安慰、不要建議、不要說教。
3. 不要預設負面情緒，也不要預設正面。
4. 不要問問題（禁止出現「？」）。
5. 每句必須以「……」結尾。
6. 語意必須直接扣合使用者原文的具體詞彙與情境，禁止空泛套話。
7. 如果這段文字沒有自然的寫作入口，就乾脆回傳空陣列。寧可沉默，也不要硬湊。

【三個搜尋方向（優先順序，不是強制各一）】
- 近：當下身體感受、具體瞬間、當前動作
- 中：回到「我」——我在意什麼、想留下什麼、真正的位置
- 遠：降低重量、縮小範圍、允許暫時停在這裡

你不需要每個方向都產出句子。
只產出「真正自然」的候選句。

【輸出格式】
請輸出 0～6 句候選起手式（越多越好，但必須自然）。
之後會由規則引擎再篩選到最終 0～3 句。`.trim()
        }
      ]
    };

    const responseSchema = {
      type: 'OBJECT',
      properties: {
        stems: {
          type: 'ARRAY',
          items: { type: 'STRING' },
          description: '0～6 句自然的句子起手式，每句以「……」結尾。若無自然入口可為空陣列。'
        }
      },
      required: ['stems']
    };

    const payload = {
      contents: [{ parts: [{ text: cleanText }] }],
      systemInstruction,
      generationConfig: {
        temperature: 0.55,
        responseMimeType: 'application/json',
        responseSchema
      }
    };

    try {
      let res: Response;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 7000);

      if (apiKey) {
        const targetUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${apiKey}`;
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
      const candidates: string[] = Array.isArray(parsed.stems) ? parsed.stems : [];

      // ---------- Stage 3 + 4：規則驗證 + 去重 + 最終選取 ----------
      return this.filterAndSelectStems(candidates, cleanText);
    } catch (err) {
      console.warn('[GeminiProxyClient] 呼叫逾時或失敗:', err);
      return [];
    }
  }

  /**
   * 規則驗證 + 去重 + 最終選 0～3 句
   */
  private static filterAndSelectStems(candidates: string[], original: string): string[] {
    const seen = new Set<string>();
    const valid: string[] = [];

    for (const raw of candidates) {
      let s = (raw || '').trim();

      // 基本清理
      if (!s) continue;
      if (!s.endsWith('……') && !s.endsWith('...')) {
        // 強制補上省略號（若模型漏掉）
        s = s.replace(/[。.!！？?]*$/, '') + '……';
      }
      // 統一成全形省略號
      s = s.replace(/\.{3,}/g, '……').replace(/…+/g, '……');

      // 規則驗證
      if (s.includes('？') || s.includes('?')) continue;                    // 禁止問句
      if (s.length < 6 || s.length > 60) continue;                          // 太短或太長
      if (this.isTooGeneric(s)) continue;                                   // 空泛套話
      if (this.isAnalyzing(s)) continue;                                    // 分析/診斷語氣
      if (this.isAdvice(s)) continue;                                       // 建議/雞湯
      if (this.isTooSimilar(s, original)) continue;                         // 幾乎只是重複原文
      if (seen.has(s)) continue;                                            // 去重

      seen.add(s);
      valid.push(s);
    }

    // 最終最多取 3 句（保持模型給的相對順序）
    return valid.slice(0, 3);
  }

  /** 空泛套話檢測 */
  private static isTooGeneric(s: string): boolean {
    const genericPatterns = [
      /如果不在意別人/,
      /如果不管別人的看法/,
      /拋開所有期待/,
      /允許自己暫時/,
      /今天就先停在這裡/,
      /如果只看眼前/,
      /我其實真正想/,
      /最讓我感到/,
      /如果把這個感覺/,
    ];
    // 如果命中兩個以上常見模板，視為空泛
    const hits = genericPatterns.filter(p => p.test(s)).length;
    return hits >= 2;
  }

  /** 分析/診斷語氣檢測 */
  private static isAnalyzing(s: string): boolean {
    const bad = [
      /你其實/,
      /這代表/,
      /這顯示/,
      /你在表達/,
      /你的感受是/,
      /這反映了/,
      /深層來說/,
      /潛意識/,
    ];
    return bad.some(p => p.test(s));
  }

  /** 建議/雞湯檢測 */
  private static isAdvice(s: string): boolean {
    const bad = [
      /應該/,
      /不妨/,
      /試著/,
      /記得/,
      /別忘了/,
      /重要的是/,
      /其實可以/,
      /你可以/,
    ];
    return bad.some(p => p.test(s));
  }

  /** 與原文相似度過高（幾乎只是複述） */
  private static isTooSimilar(stem: string, original: string): boolean {
    const stemClean = stem.replace(/……/g, '').trim();
    if (stemClean.length < 4) return true;
    // 簡單檢查：如果 stem 幾乎完整包含原文，或原文幾乎完整包含 stem
    return original.includes(stemClean) || stemClean.includes(original.slice(0, 12));
  }

  /**
   * 【已棄用】思緒分流器
   * V7.2 產品哲學已改為「不分類、不整理、不轉 Todo」
   * 請勿再在核心流程中呼叫此方法。
   * @deprecated
   */
  public static async routeThoughtAsync(rawInput: string): Promise<RoutedThought | null> {
    console.warn('[GeminiProxyClient] routeThoughtAsync 已棄用，請移除呼叫。');
    return null;
  }
}
