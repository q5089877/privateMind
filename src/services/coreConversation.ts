import { coreAnswerRole, type CoreAnswer, type CoreAnswerSource } from './ai/roles/coreAnswerRole';

const getUrl = () => {
  try { return localStorage.getItem('CLOUDFLARE_WORKER_URL') || import.meta.env.VITE_CLOUDFLARE_WORKER_URL || 'https://raspy-bush-9ab5.q5089877.workers.dev'; } catch { return ''; }
};

export async function getCoreAnswer(source: CoreAnswerSource): Promise<CoreAnswer | null> {
  const url = getUrl();
  if (!url) return null;
  try {
    const task = coreAnswerRole.create(source);
    const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(task.payload) });
    const data = response.ok ? await response.json() : null;
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    const parsed = typeof raw === 'string' ? coreAnswerRole.read(raw) : null;
    return parsed && (!source.preferredLens || parsed.lens === source.preferredLens) ? parsed : null;
  } catch { return null; }
}
