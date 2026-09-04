import type { ConversationTurn, ExplorePerspective } from '../../../domain/harbor';
import { FAST_THINKING_CONFIG, FLASH_LITE_MODEL, GeminiRoleRequest, parseJson } from './shared';

export const exploreRole = {
  create(turns: ConversationTurn[]): GeminiRoleRequest<{ transcript: string }> | null {
    const userTurns = turns.filter(turn => turn.role === 'user' && turn.content.trim());
    if (!userTurns.length) return null;
    const transcript = userTurns.map(turn => turn.content.trim()).join('\n').slice(-6000);
    const responseSchema = {
      type: 'OBJECT', properties: {
        perspectives: {
          type: 'ARRAY', minItems: 4, maxItems: 4, items: {
            type: 'OBJECT', properties: {
              id: { type: 'STRING', enum: ['context', 'change', 'body', 'suspend'] },
              title: { type: 'STRING', description: '2 到 12 字的日常標題，不可作心理或人格標籤。' },
              content: { type: 'STRING', description: '24 到 120 字的一段真正觀點。必須引用至少一段 sourcePhrases，並提出和其他三張不同的觀看位置；不是操作指令或續寫模板。' },
              followUp: { type: 'STRING', description: '8 到 72 字、可由使用者自行回答的一句延續問題。' },
              sourcePhrases: { type: 'ARRAY', minItems: 1, maxItems: 2, items: { type: 'STRING' }, description: '從原文逐字複製、每段 2 到 28 字。' }
            }, required: ['id', 'title', 'content', 'followUp', 'sourcePhrases']
          }
        }
      }, required: ['perspectives']
    };
    return {
      timeoutMs: 14_000,
      context: { transcript },
      payload: {
        model: FLASH_LITE_MODEL,
        contents: [{ role: 'user', parts: [{ text: `以下只包含使用者在這次對話親口說過的話：\n${transcript}\n\n使用者主動選了「換個角度」。請寫出剛好四段真正不同的 AI 觀點，讓他得到能繼續思考的新東西；不是四個換句話說的操作提示，也不是分析報告或結論。每張卡都要有 title、content、followUp。\n\n四個 id 必須各用一次，且四張 content 不得重複或只是同義改寫：\n- context，title 必須是「眼前發生什麼」：從這句當下的抽象感受，補足眼前正在發生的具體情境；不追問原因，也不要求回想過去。\n- change，title 必須是「哪裡不一樣」：對照現在與以前的差異，只讓變化浮現，不替人解釋原因。這裡的「以前」只能由使用者自己定義，不能使用 App 的歷史紀錄。\n- body，title 必須是「身體怎麼說」：提供暫時不分析、從疲累、緊、悶、空等感官接近的可能；不可假設身體一定有答案或存在症狀。\n- suspend，title 必須是「先不下結論」：暫時把這句很重的話放旁邊，讓它不立刻成為對自己或生活的定論；不能質疑感受真假。\n\ncontent 必須是 24 到 120 字的完整觀點，逐字引用至少一段 sourcePhrases；若有推測，使用「也許」「可能」「像是」等保留語氣。followUp 是一個可自行回答的延續問題，不替使用者填答案。sourcePhrases 必須逐字存在原文。禁止心理或人格標籤、建議、命令、診斷、因果定論、提及舊紀錄、使用「你其實」「你在」「這顯示」。繁體中文。` }] }],
        generationConfig: { temperature: 0.42, maxOutputTokens: 760, responseMimeType: 'application/json', responseSchema, thinkingConfig: FAST_THINKING_CONFIG }
      }
    };
  },

  read(raw: string, transcript: string): ExplorePerspective[] | null {
    const parsed = parseJson(raw) as { perspectives?: unknown } | null;
    const cards = Array.isArray(parsed?.perspectives) ? parsed.perspectives : [];
    const validIds = new Set<ExplorePerspective['id']>(['context', 'change', 'body', 'suspend']);
    const requiredTitles: Record<ExplorePerspective['id'], string> = {
      context: '眼前發生什麼', change: '哪裡不一樣', body: '身體怎麼說', suspend: '先不下結論'
    };
    const forbidden = ['心理', '人格', '診斷', '建議', '應該', '一定', '真正原因', '你其實', '你在', '這顯示'];
    const valid = cards.map((card: unknown): ExplorePerspective | null => {
      if (!card || typeof card !== 'object') return null;
      const item = card as Record<string, unknown>;
      const id = item.id;
      const title = typeof item.title === 'string' ? item.title.trim() : '';
      const content = typeof item.content === 'string' ? item.content.trim() : '';
      const followUp = typeof item.followUp === 'string' ? item.followUp.trim() : '';
      const sourcePhrases = Array.isArray(item.sourcePhrases)
        ? item.sourcePhrases.filter((phrase): phrase is string => typeof phrase === 'string').map(phrase => phrase.trim()).filter(phrase => phrase.length >= 2 && phrase.length <= 28)
        : [];
      const combined = `${title} ${content} ${followUp}`;
      const containsSource = sourcePhrases.some(phrase => transcript.includes(phrase) && content.includes(phrase));
      const perspectiveId = id as ExplorePerspective['id'];
      if (!validIds.has(perspectiveId) || title !== requiredTitles[perspectiveId] || content.length < 24 || content.length > 120 || followUp.length < 8 || followUp.length > 72 || !sourcePhrases.length || !containsSource || forbidden.some(word => combined.includes(word))) return null;
      return { id: perspectiveId, title, content, followUp, sourcePhrases };
    }).filter((card): card is ExplorePerspective => Boolean(card));
    const normalizedContents = valid.map(card => card.content.replace(/[\s\p{P}]/gu, ''));
    const uniqueIds = new Set(valid.map(card => card.id)).size === 4;
    const uniqueTitles = new Set(valid.map(card => card.title)).size === 4;
    const uniqueContents = new Set(normalizedContents).size === 4;
    return valid.length === 4 && uniqueIds && uniqueTitles && uniqueContents ? valid : null;
  }
};
