/**
 * Worker-only transport for Mind Harbor AI roles.
 *
 * Product prompts, schemas, and validators live in services/ai/roles. Keeping
 * this class transport-only makes it safe to iterate on one role without
 * accidentally changing another role's boundaries.
 */

import type { ConversationTurn, ExploreGroup, ExplorePerspective, ExploreRoute, SessionClosureDraft, TimelineInsight } from '../domain/harbor';
import { exploreRole } from '../services/ai/roles/exploreRole';
import { exploreRouterRole } from '../services/ai/roles/exploreRouterRole';
import { landingRole } from '../services/ai/roles/landingRole';
import { memoryRole, type MemorySource } from '../services/ai/roles/memoryRole';
import { presentFallback, presentRole } from '../services/ai/roles/presentRole';
import { normalizeCompanionResponse } from '../services/ai/roles/shared';
import { timelineRole, type TimelineSource } from '../services/ai/roles/timelineRole';

export { normalizeCompanionResponse } from '../services/ai/roles/shared';

const postJsonWithTimeout = async (url: string, payload: unknown, timeoutMs: number): Promise<Response> => {
  const doFetch = async () => {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
    } finally {
      window.clearTimeout(timeoutId);
    }
  };

  try {
    const res = await doFetch();
    if (res.status === 503 || res.status === 429) {
      await new Promise(r => window.setTimeout(r, 600));
      return await doFetch();
    }
    return res;
  } catch {
    await new Promise(r => window.setTimeout(r, 600));
    return await doFetch();
  }
};

const readModelText = async (response: Response): Promise<string | null> => {
  if (!response.ok) {
    console.warn(`[GeminiProxyClient] API call failed (${response.status}): ${response.statusText}`);
    return null;
  }
  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  return typeof text === 'string' ? text : null;
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

  public static isConfigured(): boolean {
    return !!this.getProxyUrl().trim();
  }

  /** Present Companion: one current Moment, with in-session context if available, no cross-session historical retrieval. */
  public static async getCompanionResponse(current: string, priorTurns?: ConversationTurn[]): Promise<string | null> {
    const task = presentRole.create(current, priorTurns);
    const proxyUrl = this.getProxyUrl();
    if (!proxyUrl) return null;
    try {
      const raw = await readModelText(await postJsonWithTimeout(proxyUrl, task.payload, task.timeoutMs));
      return raw ? presentRole.read(raw, current) : null;
    } catch {
      return null;
    }
  }

  /** Conservative session-only router. Ambiguity always falls back to feeling. */
  public static async getExploreRoute(turns: ConversationTurn[]): Promise<ExploreRoute | null> {
    const task = exploreRouterRole.create(turns);
    const proxyUrl = this.getProxyUrl();
    if (!task || !proxyUrl) return task ? exploreRouterRole.fallback() : null;
    try {
      const raw = await readModelText(await postJsonWithTimeout(proxyUrl, task.payload, task.timeoutMs));
      return raw ? exploreRouterRole.read(raw, task.context.transcript) : exploreRouterRole.fallback();
    } catch {
      return exploreRouterRole.fallback();
    }
  }

  /** Explore Companion: explicit session-only perspectives from orthogonal axes. */
  public static async getExplorePerspectives(turns: ConversationTurn[], excludeAxes?: string[] | ExploreGroup): Promise<ExplorePerspective[] | null> {
    const task = exploreRole.create(turns, excludeAxes);
    const proxyUrl = this.getProxyUrl();
    if (!task || !proxyUrl) return null;
    try {
      const raw = await readModelText(await postJsonWithTimeout(proxyUrl, task.payload, task.timeoutMs));
      return raw ? exploreRole.read(raw, task.context.transcript) : null;
    } catch {
      return null;
    }
  }

  /** Landing Companion: only user turns from this session are evidence. */
  public static async getSessionClosure(turns: ConversationTurn[]): Promise<SessionClosureDraft | null> {
    const task = landingRole.create(turns);
    const proxyUrl = this.getProxyUrl();
    if (!task || !proxyUrl) return null;
    try {
      const raw = await readModelText(await postJsonWithTimeout(proxyUrl, task.payload, task.timeoutMs));
      return raw ? landingRole.read(raw) : null;
    } catch {
      return null;
    }
  }

  /** Timeline Reader: evidence-backed reading of an already scoped set of originals. */
  public static async getTimelineInsight(entries: TimelineSource[]): Promise<TimelineInsight | null> {
    const task = timelineRole.create(entries);
    const proxyUrl = this.getProxyUrl();
    if (!task || !proxyUrl) return null;
    try {
      const raw = await readModelText(await postJsonWithTimeout(proxyUrl, task.payload, task.timeoutMs));
      return raw ? timelineRole.read(raw, entries) : null;
    } catch {
      return null;
    }
  }

  /** Memory Retriever: evidence selection only, never an unrequested interpretation. */
  public static async findRelevantMoments(entries: MemorySource[]): Promise<string[] | null> {
    const task = memoryRole.create(entries);
    const proxyUrl = this.getProxyUrl();
    if (!task || !proxyUrl) return null;
    try {
      const raw = await readModelText(await postJsonWithTimeout(proxyUrl, task.payload, task.timeoutMs));
      return raw ? memoryRole.read(raw, entries) : null;
    } catch {
      return null;
    }
  }
}
