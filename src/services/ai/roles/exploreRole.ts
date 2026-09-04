import type { ConversationTurn, ExploreGroup, ExplorePerspective, ExplorePerspectiveId } from '../../../domain/harbor';
import { FAST_THINKING_CONFIG, FLASH_LITE_MODEL, GeminiRoleRequest, parseJson } from './shared';

interface CardDefinition {
  id: ExplorePerspectiveId;
  title: string;
  instruction: string;
}

const CARD_DEFINITIONS: Record<ExploreGroup, CardDefinition[]> = {
  feeling: [
    { id: 'context', title: '眼前發生什麼', instruction: '從抽象感受補足此刻正在發生的具體情境；不追問原因，也不要求回想過去。' },
    { id: 'change', title: '哪裡不一樣', instruction: '對照現在與以前的差異，只讓變化浮現；「以前」只能由使用者在本次對話定義。' },
    { id: 'body', title: '身體怎麼說', instruction: '提供暫時不分析、從感官接近的可能；不可假設身體必有答案或存在症狀。' },
    { id: 'suspend', title: '先不下結論', instruction: '暫時把一句重的話放旁邊，避免它成為對自己或生活的定論；不可質疑感受真假。' }
  ],
  decision: [
    { id: 'values', title: '我想守住什麼', instruction: '辨認原文已說出的價值、底線或不願失去的事；不替人指定優先順序。' },
    { id: 'constraint', title: '現實卡在哪裡', instruction: '區分原文真正提到的限制、成本或資源；不可把猜測補成事實。' },
    { id: 'reversible', title: '哪一步還能回頭', instruction: '看選擇是否有可逆的小步；不可變成行動指令或風險建議。' },
    { id: 'time', title: '放到之後看', instruction: '拉開時間距離看今天急著決定的事；不可預測結果。' }
  ],
  relationship: [
    { id: 'self', title: '我在意什麼', instruction: '指出使用者親口說出的感受、期待、界線或受影響之處。' },
    { id: 'unknown', title: '還不知道什麼', instruction: '區分已知的對方言行與未知想法；不可替對方推測恐懼、意圖或防衛。' },
    { id: 'observer', title: '旁觀者會看見什麼', instruction: '只根據已說出的互動描述可觀察行為；不可做道德評價。' },
    { id: 'system', title: '環境正在推什麼', instruction: '只有原文有制度、角色、資源或情境證據時才指出其可能影響；不可虛構結構原因。' }
  ]
};

const transcriptFrom = (turns: ConversationTurn[]) => turns
  .filter(turn => turn.role === 'user' && turn.content.trim())
  .map(turn => turn.content.trim())
  .join('\n')
  .slice(-6000);

export const exploreRole = {
  create(turns: ConversationTurn[], group: ExploreGroup): GeminiRoleRequest<{ transcript: string; group: ExploreGroup }> | null {
    const transcript = transcriptFrom(turns);
    if (!transcript) return null;
    const cards = CARD_DEFINITIONS[group];
    const responseSchema = {
      type: 'OBJECT', properties: {
        perspectives: {
          type: 'ARRAY', minItems: 4, maxItems: 4, items: {
            type: 'OBJECT', properties: {
              id: { type: 'STRING', enum: cards.map(card => card.id) },
              title: { type: 'STRING', description: '必須完全等於指定標題。' },
              content: { type: 'STRING', description: '24 到 120 字的一段真正觀點，必須引用至少一段 sourcePhrases。' },
              followUp: { type: 'STRING', description: '8 到 72 字、可由使用者自行回答的一句延續問題。' },
              sourcePhrases: { type: 'ARRAY', minItems: 1, maxItems: 2, items: { type: 'STRING' } }
            }, required: ['id', 'title', 'content', 'followUp', 'sourcePhrases']
          }
        }
      }, required: ['perspectives']
    };
    const instructions = cards.map(card => `- ${card.id}，title 必須是「${card.title}」：${card.instruction}`).join('\n');
    return {
      timeoutMs: 14_000,
      context: { transcript, group },
      payload: {
        model: FLASH_LITE_MODEL,
        contents: [{ role: 'user', parts: [{ text: `以下只包含使用者在這次對話親口說過的話：\n${transcript}\n\n使用者主動選了「換個角度」，這次只使用「${group}」這一組。請寫出剛好四段真正不同、平級的 AI 觀點；不是四個操作提示、分析報告或結論。每張卡都要有 title、content、followUp。\n\n${instructions}\n\n每張 content 都必須逐字引用至少一段 sourcePhrases，並且和其他三張不可重複或同義改寫。若有推測，使用「也許」「可能」「像是」等保留語氣。followUp 是一個可自行回答的延續問題，不替使用者填答案。禁止心理或人格標籤、建議、命令、診斷、因果定論、提及舊紀錄、使用「你其實」「你在」「這顯示」。繁體中文。` }] }],
        generationConfig: { temperature: 0.42, maxOutputTokens: 760, responseMimeType: 'application/json', responseSchema, thinkingConfig: FAST_THINKING_CONFIG }
      }
    };
  },

  read(raw: string, transcript: string, group: ExploreGroup): ExplorePerspective[] | null {
    const parsed = parseJson(raw) as { perspectives?: unknown } | null;
    const cards = Array.isArray(parsed?.perspectives) ? parsed.perspectives : [];
    const definitions = CARD_DEFINITIONS[group];
    const requiredTitles = new Map(definitions.map(card => [card.id, card.title]));
    const forbidden = ['心理', '人格', '診斷', '建議', '應該', '一定', '真正原因', '你其實', '你在', '這顯示'];
    const valid = cards.map((card: unknown): ExplorePerspective | null => {
      if (!card || typeof card !== 'object') return null;
      const item = card as Record<string, unknown>;
      const id = item.id as ExplorePerspectiveId;
      const title = typeof item.title === 'string' ? item.title.trim() : '';
      const content = typeof item.content === 'string' ? item.content.trim() : '';
      const followUp = typeof item.followUp === 'string' ? item.followUp.trim() : '';
      const sourcePhrases = Array.isArray(item.sourcePhrases)
        ? item.sourcePhrases.filter((phrase): phrase is string => typeof phrase === 'string').map(phrase => phrase.trim()).filter(phrase => phrase.length >= 2 && phrase.length <= 28)
        : [];
      const combined = `${title} ${content} ${followUp}`;
      const containsSource = sourcePhrases.some(phrase => transcript.includes(phrase) && content.includes(phrase));
      if (!requiredTitles.has(id) || title !== requiredTitles.get(id) || content.length < 24 || content.length > 120 || followUp.length < 8 || followUp.length > 72 || !sourcePhrases.length || !containsSource || forbidden.some(word => combined.includes(word))) return null;
      return { id, title, content, followUp, sourcePhrases };
    }).filter((card): card is ExplorePerspective => Boolean(card));
    const normalized = valid.map(card => card.content.replace(/[\s\p{P}]/gu, ''));
    return valid.length === 4
      && new Set(valid.map(card => card.id)).size === 4
      && new Set(valid.map(card => card.title)).size === 4
      && new Set(normalized).size === 4
      ? valid
      : null;
  }
};
