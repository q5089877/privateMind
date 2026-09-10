import type { ConversationTurn, ExplorePerspective, ExplorePerspectiveId } from '../../../domain/harbor';
import { FAST_THINKING_CONFIG, FLASH_LITE_MODEL, GeminiRoleRequest, parseJson } from './shared';

export const ORTHOGONAL_AXIS_DEFINITIONS: Record<string, { title: string; instruction: string }> = {
  chaos_body: { title: '身體在哪裡', instruction: '只從原文已提到的身體或感官線索靠近，不假設症狀，也不替感受命名。' },
  chaos_now: { title: '現在最滿的是什麼', instruction: '只整理當下最佔據注意力的原文，不追問原因，也不延伸成結論。' },
  chaos_trigger: { title: '哪一個時刻感受最強', instruction: '找出原文已提到的時間、場景或互動轉折，不自行創造觸發原因。' },
  chaos_exception: { title: '哪裡還沒被填滿', instruction: '尋找原文中仍然沒有被這件事影響的具體部分，不強迫使用者找正面答案。' },
  decision_priorities: { title: '真正想保住的是什麼', instruction: '只指出原文已說出的價值、底線或不願失去的事，不替使用者排序。' },
  decision_criteria: { title: '到底在比較哪些東西', instruction: '拆出原文中同時被放在一起衡量的選項或條件，不提供選擇建議。' },
  decision_irreversible: { title: '什麼決定很難回頭', instruction: '只區分原文裡明確不可逆與可調整的部分，不替使用者預測後果。' },
  decision_cost: { title: '確定要承擔的代價是什麼', instruction: '只整理選項已明確帶來的成本或限制，不把猜測寫成代價。' },
  interpersonal_unknown: { title: '還不知道什麼', instruction: '清楚分開原文看見的對方行為與尚未知道的原因，不猜第三方動機。' },
  interpersonal_cared: { title: '我在意什麼', instruction: '指出使用者親口說出的落差、感受、期待或界線，不替使用者命名深層需求。' },
  interpersonal_controllable: { title: '我能管什麼', instruction: '分開對方的反應與使用者能決定的互動範圍，不把它寫成行動命令。' },
  interpersonal_observable: { title: '實際看得到什麼', instruction: '只描述原文中的可觀察行為、時間與互動，不加入任何心理解釋。' }
};

export const EXPLORE_CONTEXTS = {
  context_chaos: ['chaos_body', 'chaos_now', 'chaos_trigger', 'chaos_exception'],
  context_decision: ['decision_priorities', 'decision_criteria', 'decision_irreversible', 'decision_cost'],
  context_interpersonal: ['interpersonal_unknown', 'interpersonal_cared', 'interpersonal_controllable', 'interpersonal_observable']
} as const;

const contextForAxis = (axis: string) =>
  (Object.entries(EXPLORE_CONTEXTS).find(([, axes]) => axes.includes(axis as never))?.[0] || 'context_chaos') as keyof typeof EXPLORE_CONTEXTS;

const contextForTranscript = (transcript: string): keyof typeof EXPLORE_CONTEXTS => {
  if (/(對方|他|她|同事|主管|朋友|家人|伴侶|關係|聊天|溝通|冷淡|疏遠|陌生人|爭吵)/u.test(transcript)) {
    return 'context_interpersonal';
  }
  if (/(選擇|決定|要不要|該不該|取捨|比較|離職|分手|搬家|答應|拒絕)/u.test(transcript)) {
    return 'context_decision';
  }
  return 'context_chaos';
};

export function sampleOrthogonalAxes(transcript: string, excludeAxes: string[] = []): string[] {
  const context = contextForTranscript(transcript);
  const axes = [...EXPLORE_CONTEXTS[context]];
  const available = axes.filter(axis => !excludeAxes.includes(axis));
  const pool = available.length >= 3 ? available : axes;
  return [...pool].sort(() => Math.random() - 0.5).slice(0, 3);
}

const transcriptFrom = (turns: ConversationTurn[]) => turns
  .filter(turn => turn.role === 'user' && turn.content.trim())
  .map(turn => turn.content.trim())
  .join('\n')
  .slice(-6000);

export const exploreRole = {
  create(turns: ConversationTurn[], excludeAxes?: string[]): GeminiRoleRequest<{ transcript: string }> | null {
    const transcript = transcriptFrom(turns);
    if (!transcript) return null;
    const excluded = Array.isArray(excludeAxes) ? excludeAxes : [];
    const targetAxes = sampleOrthogonalAxes(transcript, excluded);
    const responseSchema = {
      type: 'OBJECT', properties: {
        perspectives: {
          type: 'ARRAY', minItems: targetAxes.length, maxItems: targetAxes.length, items: {
            type: 'OBJECT', properties: {
              id: { type: 'STRING', enum: targetAxes },
              title: { type: 'STRING', description: '必須等於該正交軸指定的中文標題。' },
              content: { type: 'STRING', description: '20 到 65 字的直白大白話觀點，針對該軸度進行認知切換，嚴禁文學比喻或憑空腦補。' },
              followUp: { type: 'STRING', description: '8 到 32 字、可由使用者自行回答的一句延續思考。' },
              sourcePhrases: { type: 'ARRAY', minItems: 1, maxItems: 2, items: { type: 'STRING' }, description: '本次對話中與該觀點對應的 1 到 2 段原話短語（2 到 28 字）。' }
            }, required: ['id', 'title', 'content', 'followUp', 'sourcePhrases']
          }
        }
      }, required: ['perspectives']
    };
    const instructions = targetAxes
      .map(id => `- ${id}（${ORTHOGONAL_AXIS_DEFINITIONS[id]?.title || id}）：${ORTHOGONAL_AXIS_DEFINITIONS[id]?.instruction || ''}`)
      .join('\n');

    return {
      timeoutMs: 14_000,
      context: { transcript },
      payload: {
        model: FLASH_LITE_MODEL,
        contents: [{ role: 'user', parts: [{ text: `以下只包含使用者在這次對話親口說過的話：\n${transcript}\n\n使用者主動點選了「換個角度」。
請嚴格針對以下指定抽出的 ${targetAxes.length} 條【互斥正交認知軸度】，各自生成 1 個視角卡（剛好 ${targetAxes.length} 張卡，每張卡的 id 必須嚴格對應）：
${instructions}

【核心文風禁令】：
- 嚴禁同義反覆：三張卡的推理機制完全獨立，分別對應其指定軸度。
- 嚴禁憑空腦補：絕對不可捏造使用者沒提及的領域（如工作、效率、壓力、家庭等）。只根據使用者說出的內容延伸。
- 嚴禁文學比喻與三流散文：嚴禁「時間悄悄過去的刻度」、「未曾靠近的距離」、「法庭」、「審判」、「鐘聲」等虛構比喻或過度修飾。請一律用口語、客觀真誠的大白話。
- 嚴禁心理學標籤與教訓：禁止使用「你其實」、「這顯示」、「心理防衛」等說教口氣。繁體中文。` }] }],
        generationConfig: { temperature: 0.35, maxOutputTokens: 550, responseMimeType: 'application/json', responseSchema, thinkingConfig: FAST_THINKING_CONFIG }
      }
    };
  },

  read(raw: string, transcript: string): ExplorePerspective[] | null {
    const parsed = parseJson(raw) as { perspectives?: unknown } | null;
    const cards = Array.isArray(parsed?.perspectives) ? parsed.perspectives : [];
    const forbidden = ['心理', '人格', '診斷', '建議', '應該', '一定', '真正原因', '你其實', '你在', '這顯示'];
    const valid = cards.map((card: unknown): ExplorePerspective | null => {
      if (!card || typeof card !== 'object') return null;
      const item = card as Record<string, unknown>;
      const id = item.id as ExplorePerspectiveId;
      const def = ORTHOGONAL_AXIS_DEFINITIONS[id];
      if (!def) return null;
      const title = typeof item.title === 'string' ? item.title.trim() : def.title;
      const content = typeof item.content === 'string' ? item.content.trim() : '';
      const followUp = typeof item.followUp === 'string' ? item.followUp.trim() : '';
      const sourcePhrases = Array.isArray(item.sourcePhrases)
        ? item.sourcePhrases.filter((phrase): phrase is string => typeof phrase === 'string').map(phrase => phrase.trim()).filter(phrase => phrase.length >= 2 && phrase.length <= 28)
        : [];
      const combined = `${title} ${content} ${followUp}`;
      const validSource = sourcePhrases.length > 0 && sourcePhrases.some(phrase => transcript.includes(phrase));
      if (content.length < 15 || content.length > 85 || followUp.length < 5 || followUp.length > 40 || !validSource || forbidden.some(word => combined.includes(word))) return null;
      return { id, title: def.title, content, followUp, sourcePhrases };
    }).filter((card): card is ExplorePerspective => Boolean(card));

    const normalized = valid.map(card => card.content.replace(/[\s\p{P}]/gu, ''));
    const contexts = new Set(valid.map(card => contextForAxis(card.id)));
    return valid.length === 3
      && new Set(valid.map(card => card.id)).size === valid.length
      && contexts.size === 1
      && new Set(normalized).size === valid.length
      ? valid
      : null;
  }
};
