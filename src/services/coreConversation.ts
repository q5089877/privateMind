import { coreAnswerRole, type CoreAnswer, type CoreAnswerSource } from './ai/roles/coreAnswerRole';
import { psychologyAnswerRole, type PsychologyAnswer, type PsychologyAnswerSource, type PsychologyLens } from './ai/roles/psychologyAnswerRole';

export type PerspectiveId = CoreAnswer['lens'] | PsychologyLens;
export type PerspectiveAnswer = CoreAnswer | PsychologyAnswer;
export interface PerspectiveAnswerSource { content: string; recentContext?: string[]; preferredLens: PerspectiveId; }

const getUrl = () => {
  try { return import.meta.env.VITE_AI_PROXY_URL || localStorage.getItem('CLOUDFLARE_WORKER_URL') || import.meta.env.VITE_CLOUDFLARE_WORKER_URL || 'https://raspy-bush-9ab5.q5089877.workers.dev'; } catch { return ''; }
};

const requestJson = async (url: string, payload: Record<string, unknown>, timeoutMs: number): Promise<Record<string, any> | null> => {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    return response.ok ? await response.json() as Record<string, any> : null;
  } catch {
    return null;
  } finally {
    window.clearTimeout(timeoutId);
  }
};

export async function getCoreAnswer(source: CoreAnswerSource): Promise<CoreAnswer | null> {
  const url = getUrl();
  if (!url) return null;
  try {
    const task = coreAnswerRole.create(source);
    const data = await requestJson(url, task.payload, task.timeoutMs);
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    const parsed = typeof raw === 'string' ? coreAnswerRole.read(raw, source) : null;
    return parsed && (!source.preferredLens || parsed.lens === source.preferredLens) ? parsed : null;
  } catch { return null; }
}

export async function getPerspectiveAnswer(source: PerspectiveAnswerSource): Promise<PerspectiveAnswer | null> {
  if (source.preferredLens === 'diamond_sutra' || source.preferredLens === 'tao_te_ching') return getCoreAnswer(source as CoreAnswerSource);
  const url = getUrl();
  if (!url) return null;
  try {
    const psychologySource = source as PsychologyAnswerSource;
    const task = psychologyAnswerRole.create(psychologySource);
    const data = await requestJson(url, task.payload, task.timeoutMs);
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return typeof raw === 'string' ? psychologyAnswerRole.read(raw, psychologySource) : null;
  } catch { return null; }
}
