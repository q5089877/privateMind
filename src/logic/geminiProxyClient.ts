/**
 * Worker-only transport for Mind Harbor AI roles.
 *
 * Product prompts, schemas, and validators live in services/ai/roles. Keeping
 * this class transport-only makes it safe to iterate on one role without
 * accidentally changing another role's boundaries.
 */

import type { ConversationTurn, ExplorePerspective, SessionClosureDraft, TimelineInsight } from '../domain/harbor';
import { exploreRole } from '../services/ai/roles/exploreRole';
import { landingRole } from '../services/ai/roles/landingRole';
import { memoryRole, type MemorySource } from '../services/ai/roles/memoryRole';
import { presentFallback, presentRole } from '../services/ai/roles/presentRole';
import { normalizeCompanionResponse } from '../services/ai/roles/shared';
import { timelineRole, type TimelineSource } from '../services/ai/roles/timelineRole';

export { normalizeCompanionResponse } from '../services/ai/roles/shared';

const postJsonWithTimeout = async (url: string, payload: unknown, timeoutMs: number): Promise<Response> => {
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

const readModelText = async (response: Response): Promise<string | null> => {
  if (!response.ok) return null;
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

  /** Present Companion: one current Moment, no historical retrieval. */
  public static async getCompanionResponse(current: string): Promise<string | null> {
    const task = presentRole.create(current);
    const proxyUrl = this.getProxyUrl();
    if (!proxyUrl) return presentFallback(current);
    try {
      const raw = await readModelText(await postJsonWithTimeout(proxyUrl, task.payload, task.timeoutMs));
      return raw ? presentRole.read(raw, current) : presentFallback(current);
    } catch {
      return presentFallback(current);
    }
  }

  /** Explore Companion: explicit session-only perspective request. */
  public static async getExplorePerspectives(turns: ConversationTurn[]): Promise<ExplorePerspective[] | null> {
    const task = exploreRole.create(turns);
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
