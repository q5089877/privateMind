/** Gemini Client for the current Mind Harbor AI roles. */

import type { ConversationTurn, ExplorePerspective, SessionClosureDraft, TimelineInsight } from '../domain/harbor';

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
  public static async getCompanionResponse(current: string): Promise<string | null> {
    const proxyUrl = this.getProxyUrl();
    const apiKey = this.getApiKey();
    if (!proxyUrl && !apiKey) return null;
    const payload = {
      model: GEMINI_MODEL,
      contents: [{ role: 'user', parts: [{ text: `使用者剛留下這一句：\n${current}\n\n請以繁體中文回覆兩到三句、最多72字。只根據這一句話，提供被接住的感覺與一個溫和、可選的新觀看角度。不得提及過去紀錄、記憶、模式、重複或任何你未看見的內容。禁止診斷、心理標籤、建議、命令、空泛安慰、聲稱知道真正原因。最後保留「不用現在想完」的餘地。` }] }],
      generationConfig: { temperature: 0.45, maxOutputTokens: 72, responseMimeType: 'text/plain', thinkingConfig: FAST_THINKING_CONFIG }
    };
    try {
      const response = await postJsonWithTimeout(proxyUrl || `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`, payload, 20_000);
      if (!response.ok) return null;
      const data = await response.json();
      const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      const text = typeof raw === 'string' ? normalizeCompanionResponse(raw) : '';
      return text && text.length <= 180 ? text : null;
    } catch {
      return null;
    }
  }

  /**
   * An explicit "change perspective" action. It is not a reading of history:
   * only the person's visible turns from this one open session are sent here.
   */
  public static async getExplorePerspectives(turns: ConversationTurn[]): Promise<ExplorePerspective[] | null> {
    const userTurns = turns.filter(turn => turn.role === 'user' && turn.content.trim());
    if (!userTurns.length) return null;
    const proxyUrl = this.getProxyUrl();
    const apiKey = this.getApiKey();
    if (!proxyUrl && !apiKey) return null;

    const sourceText = userTurns.map(turn => turn.content.trim()).join('\n');
    const transcript = sourceText.slice(-6000);
    const responseSchema = {
      type: 'OBJECT',
      properties: {
        perspectives: {
          type: 'ARRAY',
          minItems: 4,
          maxItems: 4,
          items: {
            type: 'OBJECT',
            properties: {
              id: { type: 'STRING', enum: ['focus', 'contrast', 'reframe', 'open'] },
              label: { type: 'STRING', description: '2 到 12 字的日常操作名稱，不可作心理或人格標籤。' },
              prompt: { type: 'STRING', description: '12 到 88 字的續寫起手式，使用第一人稱或中性語氣，必須以「……」結尾。' },
              sourcePhrases: { type: 'ARRAY', minItems: 1, maxItems: 2, items: { type: 'STRING' }, description: '從原文逐字複製、每段 2 到 28 字。' }
            },
            required: ['id', 'label', 'prompt', 'sourcePhrases']
          }
        }
      },
      required: ['perspectives']
    };
    const payload = {
      model: GEMINI_MODEL,
      contents: [{ role: 'user', parts: [{ text: `以下只包含使用者在這次對話親口說過的話：\n${transcript}\n\n使用者主動選了「換個角度」。請產生剛好四個不同的續寫入口，讓他自行決定要不要使用；不是分析報告，也不是結論。\n\n四個 id 必須各用一次：\n- focus：只停在一個具體詞句。\n- contrast：把兩個原文中可並排的具體詞句放在一起；若原文沒有兩件事，改成分辨一句話中的兩個部分。\n- reframe：用原文裡已經出現的另一個說法或例外，提供不同觀看位置。\n- open：留下今天還不必回答的一處，讓人能繼續寫。\n\n每張卡的 sourcePhrases 必須逐字存在原文；prompt 也必須直接引用至少其中一段。只提供可接著寫的起手式，句末是「……」。禁止解釋、摘要、下結論、心理或人格標籤、建議、命令、診斷、因果推論、提及舊紀錄、使用「你其實」「你在」「這顯示」，以及問號。繁體中文。` }] }],
      generationConfig: { temperature: 0.28, maxOutputTokens: 420, responseMimeType: 'application/json', responseSchema, thinkingConfig: FAST_THINKING_CONFIG }
    };
    try {
      const response = await postJsonWithTimeout(proxyUrl || `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`, payload, 14_000);
      if (!response.ok) return null;
      const data = await response.json();
      const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : null;
      const cards = Array.isArray(parsed?.perspectives) ? parsed.perspectives : [];
      const validIds = new Set<ExplorePerspective['id']>(['focus', 'contrast', 'reframe', 'open']);
      const forbidden = ['心理', '人格', '診斷', '建議', '應該', '一定', '真正原因', '你其實', '你在', '這顯示', '?', '？'];
      const valid = cards.map((card: unknown): ExplorePerspective | null => {
        if (!card || typeof card !== 'object') return null;
        const item = card as Record<string, unknown>;
        const id = item.id;
        const label = typeof item.label === 'string' ? item.label.trim() : '';
        const prompt = typeof item.prompt === 'string' ? item.prompt.trim() : '';
        const sourcePhrases = Array.isArray(item.sourcePhrases)
          ? item.sourcePhrases.filter((phrase): phrase is string => typeof phrase === 'string').map(phrase => phrase.trim()).filter(phrase => phrase.length >= 2 && phrase.length <= 28)
          : [];
        const combined = `${label} ${prompt}`;
        const containsSource = sourcePhrases.some(phrase => transcript.includes(phrase) && prompt.includes(phrase));
        if (!validIds.has(id as ExplorePerspective['id']) || label.length < 2 || label.length > 12 || prompt.length < 12 || prompt.length > 88 || !prompt.endsWith('……') || !sourcePhrases.length || !containsSource || forbidden.some(word => combined.includes(word))) return null;
        return { id: id as ExplorePerspective['id'], label, prompt, sourcePhrases };
      }).filter((card): card is ExplorePerspective => Boolean(card));
      return valid.length === 4 && new Set(valid.map(card => card.id)).size === 4 ? valid : null;
    } catch {
      return null;
    }
  }

  /**
   * A temporary landing for one visible conversation. It is intentionally not a
   * diagnosis, recommendation, or a claim about anything outside these turns.
   */
  public static async getSessionClosure(turns: ConversationTurn[]): Promise<SessionClosureDraft | null> {
    const userTurns = turns.filter(turn => turn.role === 'user' && turn.content.trim());
    if (!userTurns.length) return null;
    const proxyUrl = this.getProxyUrl();
    const apiKey = this.getApiKey();
    if (!proxyUrl && !apiKey) return null;

    // AI's earlier wording is never evidence for a closure. Only the person's own turns count.
    const transcript = userTurns
      .map(turn => `使用者：${turn.content}`)
      .join('\n');
    const responseSchema = {
      type: 'OBJECT',
      properties: {
        takeaway: { type: 'STRING', description: '12 到 100 字；只整理這段對話實際提過、可以帶走的一點。' },
        unresolved: { type: 'STRING', description: '4 到 72 字；指出今天可以暫不回答的一個開放處，不可變成問題或待辦。' },
        resumeAnchor: { type: 'STRING', description: '0 到 48 字；下次若想回來，可從使用者原文的一個方向接著說。' }
      },
      required: ['takeaway', 'unresolved', 'resumeAnchor']
    };
    const payload = {
      model: GEMINI_MODEL,
      contents: [{ role: 'user', parts: [{ text: `以下是使用者這次親口留下的句子：\n${transcript}\n\n請替這次對話寫一個「暫時收束」，不是結論。它讓人能帶走一點已經說清楚的東西，也允許尚未回答的地方留在這裡。\n\n回傳 JSON：\n- takeaway：12 到 100 字，只根據這些句子，寫出一個具體、可帶走的整理。\n- unresolved：4 到 72 字，寫出今天可以暫不回答的開放處；不得用問號、不得形成待辦或建議。\n- resumeAnchor：0 到 48 字，用一個使用者已提過的具體方向，作為下次可接續的起點。\n\n禁止：心理、壓力、恐懼、焦慮、逃避、人格、診斷、建議、應該、一定、真正原因、你其實、你在、這顯示。不可替使用者下結論、補上沒有說過的背景。語氣平實、繁體中文。` }] }],
      generationConfig: { temperature: 0.25, maxOutputTokens: 180, responseMimeType: 'application/json', responseSchema, thinkingConfig: FAST_THINKING_CONFIG }
    };
    try {
      const response = await postJsonWithTimeout(proxyUrl || `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`, payload, 12_000);
      if (!response.ok) return null;
      const data = await response.json();
      const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : null;
      const takeaway = typeof parsed?.takeaway === 'string' ? parsed.takeaway.trim() : '';
      const unresolved = typeof parsed?.unresolved === 'string' ? parsed.unresolved.trim() : '';
      const resumeAnchor = typeof parsed?.resumeAnchor === 'string' ? parsed.resumeAnchor.trim() : '';
      const forbidden = ['心理', '人格', '診斷', '建議', '應該', '一定', '真正原因', '你其實', '你在', '這顯示'];
      const invalid = (value: string) => forbidden.some(word => value.includes(word));
      if (takeaway.length < 12 || takeaway.length > 100 || unresolved.length < 4 || unresolved.length > 72 || resumeAnchor.length > 48 || unresolved.includes('？') || unresolved.includes('?') || invalid(takeaway) || invalid(unresolved) || invalid(resumeAnchor)) return null;
      return { takeaway, unresolved, ...(resumeAnchor ? { resumeAnchor } : {}) };
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
        unresolved: { type: 'STRING' }
      },
      required: ['evidence', 'angle', 'unresolved']
    };
    const payload = {
      model: REFLECTION_MODEL,
      contents: [{ role: 'user', parts: [{ text: `以下是同一條跨時間累積的原文：\n${timeline}\n\n請提供一個「分開寫時不容易看見」的新角度。它只能指出原文可驗證的缺口、轉折、重複或不對稱，不能推論原因、心理狀態或給建議。請以「這幾段裡」、「前面」或「後面」描述，不要評論使用者這個人。\n\n回傳 JSON：\n- evidence：至少兩則日期與原文逐字片段，phrase 必須從該日期的內容逐字複製。\n- angle：20 到 120 字的具體觀察；必須建立在 evidence 上，不能只是按日期重述。\n- unresolved：8 到 64 字，指出一個還可再看的地方；不得用問號、不得要求行動、不得給二選一答案或替使用者下結論。\n\n禁止：你其實、你在、這顯示、心理、壓力、恐懼、焦慮、逃避、人格、診斷、建議、應該、一定、真正原因。` }] }],
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
      const unresolved = typeof parsed?.unresolved === 'string' ? parsed.unresolved.trim() : '';
      const byDate = new Map(entries.map(entry => [entry.date, entry.content]));
      const forbidden = ['你其實', '你在', '這顯示', '心理', '壓力', '恐懼', '焦慮', '逃避', '人格', '診斷', '建議', '應該', '一定', '真正原因'];
      const bad = (value: string) => forbidden.some(word => value.includes(word));
      if (evidence.length < 2 || evidence.some(item => !item.date || !item.phrase || !byDate.get(item.date)?.includes(item.phrase)) || angle.length < 20 || angle.length > 120 || unresolved.length < 8 || unresolved.length > 64 || unresolved.includes('？') || unresolved.includes('?') || bad(angle) || bad(unresolved)) return null;
      return { evidence, angle, unresolved };
    } catch {
      return null;
    }
  }

  /** First stage of homepage discovery: select evidence only, with no interpretation. */
  public static async findRelevantMoments(entries: Array<{ id: string; createdAt: number; date: string; content: string }>): Promise<string[] | null> {
    if (entries.length < 3) return null;
    const proxyUrl = this.getProxyUrl();
    const apiKey = this.getApiKey();
    if (!proxyUrl && !apiKey) return null;
    const timeline = entries.map(item => `[${item.id}] ${item.date}｜${item.content}`).join('\n');
    const payload = {
      model: GEMINI_MODEL,
      contents: [{ role: 'user', parts: [{ text: `以下是使用者近期留下的原文：\n${timeline}\n\n請優先挑出一組最值得回看的 3 到 5 段原文 id。它們必須跨至少兩個自然日、第一筆與最後一筆至少相隔 24 小時，而且能從原文看見具體的重複、轉折、缺口或拉扯。只負責選 id：不要解釋、不要命名、不要下結論。只在完全沒有可驗證共同脈絡時回傳 {"momentIds":[]}。` }] }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 96,
        responseMimeType: 'application/json',
        responseSchema: { type: 'OBJECT', properties: { momentIds: { type: 'ARRAY', maxItems: 5, items: { type: 'STRING' } } }, required: ['momentIds'] },
        thinkingConfig: FAST_THINKING_CONFIG
      }
    };
    try {
      const response = await postJsonWithTimeout(proxyUrl || `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`, payload, 8_000);
      if (!response.ok) return null;
      const data = await response.json();
      const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : null;
      const ids: string[] = Array.isArray(parsed?.momentIds) ? [...new Set<string>(parsed.momentIds.filter((id: unknown): id is string => typeof id === 'string'))] : [];
      const byId = new Map(entries.map(entry => [entry.id, entry]));
      const selected = ids.map(id => byId.get(id)).filter((entry): entry is { id: string; createdAt: number; date: string; content: string } => Boolean(entry));
      const dates = new Set(selected.map(entry => new Date(entry.createdAt).toDateString()));
      const timestamps = selected.map(entry => entry.createdAt);
      const span = timestamps.length ? Math.max(...timestamps) - Math.min(...timestamps) : 0;
      return selected.length >= 3 && dates.size >= 2 && span >= 24 * 60 * 60 * 1000 ? ids : null;
    } catch {
      return null;
    }
  }

}
