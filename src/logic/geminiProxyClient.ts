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
    try {
      return (
        (typeof localStorage !== 'undefined' ? localStorage.getItem('CLOUDFLARE_WORKER_URL') : null) ||
        (typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_CLOUDFLARE_WORKER_URL : null) ||
        'https://raspy-bush-9ab5.q5089877.workers.dev'
      );
    } catch {
      return 'https://raspy-bush-9ab5.q5089877.workers.dev';
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
    if (!cleanText || cleanText.length < 1) return [];

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
- 句首直接起筆（嚴禁以「……」或點號開頭），僅在句尾以「……」留白結尾。
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
        temperature: 0.35,
        responseMimeType: 'application/json',
        responseSchema
      }
    };

    // 支援自動重試 1 次（應對 Google 503 短暫負載與行動網路波動）
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        let res: Response;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 14000); // 放寬至 14 秒

        if (proxyUrl) {
          // 優先走 Cloudflare Worker 安全反向代理
          res = await fetch(proxyUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: 'gemini-3.5-flash-lite',
              ...payload
            }),
            signal: controller.signal
          });
        } else if (apiKey) {
          // 次選直連
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
        } else {
          clearTimeout(timeoutId);
          return [];
        }

        clearTimeout(timeoutId);

        if (!res.ok) {
          console.warn(`[GeminiProxyClient] 第 ${attempt} 次請求回應非 200: ${res.status}`);
          if (attempt === 1) {
            await new Promise(r => setTimeout(r, 600)); // 稍候重試
            continue;
          }
          return [];
        }

        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) {
          if (attempt === 1) continue;
          return [];
        }

        const candidates = this.extractStemsFromRawText(text);

        // ---------- Stage 3 + 4：規則驗證 + 去重 + 最終選取 ----------
        const result = this.filterAndSelectStems(candidates, cleanText);
        if (result.length > 0) return result;
      } catch (err) {
        console.warn(`[GeminiProxyClient] 第 ${attempt} 次呼叫失敗:`, err);
        if (attempt === 1) {
          await new Promise(r => setTimeout(r, 600));
          continue;
        }
      }
    }

    return [];
  }

  /**
   * 容錯解析器：優先標準 JSON 解析，若模型輸出非標準引號或格式則走強健行抽取
   */
  private static extractStemsFromRawText(text: string): string[] {
    // 1. 標準 JSON 嘗試
    try {
      const clean = text.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(clean);
      if (Array.isArray(parsed)) return parsed;
      if (Array.isArray(parsed?.stems)) return parsed.stems;
      if (typeof parsed === 'object' && parsed !== null) {
        for (const v of Object.values(parsed)) {
          if (Array.isArray(v)) return v as string[];
        }
      }
    } catch {
      // 容錯進入正則行提取
    }

    // 2. 備用：逐行正則抽取清洗
    const lines = text.split('\n');
    const extracted: string[] = [];

    for (const line of lines) {
      let s = line.trim();
      // 移除開頭符號
      s = s.replace(/^[\[\],"'“”‘’\s\d.、/·\-*「]+/, '').trim();
      // 移除結尾符號
      s = s.replace(/["'“”‘’\[\],，;\s」]+$/, '').trim();

      if (s.length >= 4) {
        extracted.push(s);
      }
    }

    return extracted;
  }

  /**
   * 規則驗證 + 去重 + 最終選 0～4 句
   */
  private static filterAndSelectStems(candidates: string[], original: string): string[] {
    const seen = new Set<string>();
    const valid: string[] = [];

    for (const raw of candidates) {
      let s = (raw || '').trim();

      // 基本清理：拔除句首所有省略號、點號、逗號、破折號、引號、括號、序號與標點
      s = s.replace(/^[….\-·\s\d.、/，,"'“”‘’\[\]:：;；~～]+/, '').trim();
      if (!s) continue;

      // 結尾統一為標準全形省略號 ……（先剔除所有多餘標點）
      s = s.replace(/[。.!！？?….,，:：;；\s]*$/, '') + '……';

      // 規則驗證
      if (s.includes('？') || s.includes('?')) continue;                    // 禁止問句
      if (s.length < 5 || s.length > 70) continue;                          // 放寬長度範圍 (5~70)
      if (this.isAnalyzing(s)) continue;                                    // 分析/診斷語氣
      if (this.isAdvice(s)) continue;                                       // 建議/雞湯
      if (this.isTooSimilar(s, original)) continue;                         // 幾乎只是重複原文
      if (seen.has(s)) continue;                                            // 去重

      seen.add(s);
      valid.push(s);
      if (valid.length >= 4) break;
    }
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

  /** 與原文相似度過高（僅剔除完全無延伸的純粹複述） */
  private static isTooSimilar(stem: string, original: string): boolean {
    const stemClean = stem.replace(/……/g, '').replace(/[，,。.\s]/g, '').trim();
    const origClean = original.replace(/[，,。.\s]/g, '').trim();
    if (stemClean.length < 3) return true;
    // 只有在 stem 幾乎 100% 完全等於原文時才剔除（允許包含主題詞進行語義延展）
    return stemClean === origClean;
  }

  /**
   * @deprecated
   */
  public static async routeThoughtAsync(rawInput: string): Promise<RoutedThought | null> {
    return null;
  }
}
