/** Shared transport-shaped types and parsing helpers for independent AI roles. */

export const FLASH_LITE_MODEL = 'gemini-3.5-flash-lite';
export const FLASH_MODEL = 'gemini-3.5-flash-lite';
export const FAST_THINKING_CONFIG = { thinkingLevel: 'minimal' };

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
  } catch { /* Plain text is the expected shape. */ }
  return text;
};

export const parseJson = (raw: string): unknown => {
  try { return JSON.parse(raw); }
  catch { return null; }
};
