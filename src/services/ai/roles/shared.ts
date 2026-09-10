/**
 * Shared transport-shaped types and parsing helpers for independent AI roles.
 *
 * 【模型與思考設定規範（核心防錯指引）】：
 * 1. 模型 ID 必須使用 Google Gemini 官方生產環境有效型號（'gemini-3.1-flash-lite'）。
 *    目前 Worker 實測以此型號可正常完成快速回應。
 * 2. thinkingConfig：Gemini 官方 API 規範為整數型別 thinkingBudget（如 { thinkingBudget: 0 }）。
 *    非標準欄位（如 thinkingLevel）會導致 Google 上游 JSON Schema 驗證失敗或延遲暴增。
 *    此處設為 undefined，確保 JSON 序列化時乾淨剔除該欄位，徹底消除推論延遲。
 */

export const FLASH_LITE_MODEL = 'gemini-3.1-flash-lite';
export const FLASH_MODEL = 'gemini-3.1-flash-lite';
export const FAST_THINKING_CONFIG: Record<string, unknown> | undefined = undefined;

export interface GeminiRoleRequest<Context = undefined> {
  payload: Record<string, unknown>;
  timeoutMs: number;
  context: Context;
}

/** Accept both plain Gemini text and JSON wrappers returned by older Worker settings. */
export const normalizeCompanionResponse = (value: string): string => {
  const text = value.trim().replace(/^```(?:json)?\s*|\s*```$/g, '');
  try {
    const parsed = JSON.parse(text);
    if (typeof parsed?.response === 'string') return parsed.response.trim();
    if (typeof parsed?.text === 'string') return parsed.text.trim();
    if (typeof parsed?.reading === 'string') return parsed.reading.trim();
    if (typeof parsed?.content === 'string') return parsed.content.trim();
    if (typeof parsed?.message === 'string') return parsed.message.trim();
    if (typeof parsed?.output === 'string') return parsed.output.trim();
    if (typeof parsed?.result === 'string') return parsed.result.trim();
    if (typeof parsed?.data === 'string') return parsed.data.trim();
  } catch { /* Plain text is the expected shape. */ }
  return text.replace(/^"|"$/g, '').trim();
};

export const parseJson = (raw: string): unknown => {
  try { return JSON.parse(raw); }
  catch { return null; }
};
