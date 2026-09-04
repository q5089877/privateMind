import type { ConversationTurn, ExploreGroup, ExploreRoute } from '../../../domain/harbor';
import { FAST_THINKING_CONFIG, FLASH_LITE_MODEL, GeminiRoleRequest, parseJson } from './shared';

export const DEFAULT_EXPLORE_GROUP: ExploreGroup = 'feeling';

const fallbackRoute = (): ExploreRoute => ({ group: DEFAULT_EXPLORE_GROUP, evidence: [], source: 'automatic' });

/**
 * Chooses a temporary lens only after the person explicitly asks for angles.
 * It is intentionally conservative: uncertainty is the feeling group, never a label.
 */
export const exploreRouterRole = {
  create(turns: ConversationTurn[]): GeminiRoleRequest<{ transcript: string }> | null {
    const userTurns = turns.filter(turn => turn.role === 'user' && turn.content.trim());
    if (!userTurns.length) return null;
    const transcript = userTurns.map(turn => turn.content.trim()).join('\n').slice(-6000);
    const responseSchema = {
      type: 'OBJECT', properties: {
        group: { type: 'STRING', enum: ['feeling', 'decision', 'relationship'] },
        evidence: { type: 'ARRAY', minItems: 0, maxItems: 2, items: { type: 'STRING' } }
      }, required: ['group', 'evidence']
    };
    return {
      timeoutMs: 9_000,
      context: { transcript },
      payload: {
        model: FLASH_LITE_MODEL,
        contents: [{ role: 'user', parts: [{ text: `以下只包含使用者在這次對話親口說過的話：\n${transcript}\n\n使用者主動要求「換個角度」。請只選擇最適合的一組視角。這不是人格、情緒或長期分類，不能讀取任何舊紀錄。\n\n只有在原文清楚出現實際選項、取捨、要不要做某事或難以決定的兩條路時，才可選 decision。只有在原文清楚提到一個人或角色，以及已發生的互動、衝突、期待或界線時，才可選 relationship。其餘情況、訊號混合、或不確定時，一律選 feeling。\n\nevidence 只能逐字複製本次原文。若選 decision 或 relationship，至少提供一段可驗證 evidence；若選 feeling，evidence 可為空。不要解釋，不要提出建議。繁體中文。` }] }],
        generationConfig: { temperature: 0, maxOutputTokens: 180, responseMimeType: 'application/json', responseSchema, thinkingConfig: FAST_THINKING_CONFIG }
      }
    };
  },

  read(raw: string, transcript: string): ExploreRoute {
    const parsed = parseJson(raw) as { group?: unknown; evidence?: unknown } | null;
    const group = parsed?.group;
    if (group !== 'decision' && group !== 'relationship') return fallbackRoute();
    const evidence = Array.isArray(parsed?.evidence)
      ? parsed.evidence.filter((phrase): phrase is string => typeof phrase === 'string').map(phrase => phrase.trim()).filter(phrase => phrase.length >= 2 && phrase.length <= 28 && transcript.includes(phrase))
      : [];
    return evidence.length ? { group, evidence: [...new Set(evidence)].slice(0, 2), source: 'automatic' } : fallbackRoute();
  },

  fallback: fallbackRoute
};
