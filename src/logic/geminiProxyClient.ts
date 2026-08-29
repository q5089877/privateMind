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

    // ---------- Stage 1 + 2：結構插槽 + 候選生成 ----------
    const systemInstruction = {
      parts: [
        {
          text: `你是「思緒停靠 (Mind Harbor)」的句子起手式引擎。
任務：以使用者當下寫下的文字為「唯一錨點」，輸出 0～4 句讓使用者接續書寫的「句子起手式」（每句以「……」結尾）。

━━━━━━━━━━━━━━━━━━
【第 15 項鐵律：零虛構具體化 (Zero Fabricated Specificity)】
━━━━━━━━━━━━━━━━━━
1. 【抽象展開，嚴禁具象】：
   - 只能抽象提取「當前主題」的思考結構。
   - 嚴禁自行添加任何原文未提及的：道具/場景（如：桌上、螢幕、鍵盤、店裡、購物車、網頁、信箱）、動作（如：看著、滑著、打開、手指停住）、時間副詞（如：每天、再次）。
   - 嚴禁預設情緒偏見（若使用者文字為正面/開心，嚴禁套用負面問題或卡點模板；若使用者文字為平靜，嚴禁套用說教）。
2. 【結構插槽 (Structural Slotting)】：
   - 提示句是「思維骨架」，具體事實一律由使用者自己填補。

━━━━━━━━━━━━━━━━━━
【核心視角維度（依序輸出 0～4 句，無自然入口時回傳空陣列）】
━━━━━━━━━━━━━━━━━━
1. 【近｜焦點伸展】：直接從原文核心詞展開，探索最直接的感受、瞬間、亮點、念頭或核心動機。
2. 【中｜抽離期待】：抽離外界眼光、他人標準、性價比焦慮或自我限制，回到不需要向任何人證明的真實位置。
3. 【遠｜尺度放寬】：把這份感受安放下來、拉長時間留存、或收縮至當下最小一步允許暫時停留。

【約束】
- 嚴禁問號（？）、嚴禁心理分析/診斷、嚴禁說教與指示（禁止「你應該」、「請試著」）。
- 尊重原文情緒極性，保持平靜留白。`.trim()
        }
      ]
    };

    const responseSchema = {
      type: 'OBJECT',
      properties: {
        stems: {
          type: 'ARRAY',
          items: { type: 'STRING' },
          description: '依序為近、中、遠等視角的句子起手式（0～4 句），每句以「……」結尾。若無自然入口可為空陣列。'
        }
      },
      required: ['stems']
    };

    const payload = {
      contents: [{ parts: [{ text: cleanText }] }],
      systemInstruction,
      generationConfig: {
        temperature: 0.2,
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

    // 最終最多取 4 句（保持模型給的相對順序）
    return valid.slice(0, 4);
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
