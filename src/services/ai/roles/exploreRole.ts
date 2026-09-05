import type { ConversationTurn, ExploreGroup, ExplorePerspective, ExplorePerspectiveId } from '../../../domain/harbor';
import { FAST_THINKING_CONFIG, FLASH_LITE_MODEL, GeminiRoleRequest, parseJson } from './shared';

export const ORTHOGONAL_AXIS_DEFINITIONS: Record<string, { title: string; instruction: string }> = {
  fact: { title: '事實', instruction: '拿掉原因、動機與腦補，只還原目前百分之百能確定的客觀事實。' },
  time: { title: '時間', instruction: '把現在放進更大的時間尺度；現在的狀態很重，不代表接下來也會一直是這樣。' },
  control: { title: '控制', instruction: '分清現在能改變什麼 vs 只能承受什麼；不強求心情變好，只看此刻能掌握的最小邊界。' },
  defusion: { title: '解離', instruction: '狀態不等於自己；你正在經歷這個感受，不等於你就是這樣的人。' },
  need: { title: '需求', instruction: '情緒背後往往是具體匱乏；比起逼自己振作，先看當下缺休息、陪伴、還是某種期待。' },
  body: { title: '身體', instruction: '從心理分析切換到生理感官（睡眠、體力、飲食）；停止大腦空轉，先看身體的物質基礎。' },
  context: { title: '情境', instruction: '不問「我怎麼了」，改看環境或角色推力；最近的生活或環境裡，有沒有什麼在持續消耗你。' },
  exception: { title: '例外', instruction: '尋找問題沒有出現的縫隙；最近有沒有哪怕只有半小時，情況其實沒有這麼糟？' },
  other: { title: '他者', instruction: '換成旁觀者或重要他人的位置；如果是你在乎的人遇到這事，你大概不會要求他立刻解決。' },
  scale: { title: '尺度', instruction: '從整個人生縮小到眼前具體一小部分；今天最卡住的可能只是局部，不代表全局瓦解。' },
  assumption: { title: '假設', instruction: '挑戰偷偷存在的前提；例如「非得現在想出原因嗎？」、「這件事一定非做不可嗎？」' },
  action: { title: '行動', instruction: '從想通切換到最小下一步；如果今天只讓自己稍微喘口氣或舒服 5%，做什麼最容易？' }
};

const ORTHOGONAL_CLUSTERS = [
  ['fact', 'body', 'context', 'scale'],
  ['control', 'action', 'assumption', 'exception'],
  ['defusion', 'time', 'need', 'other']
];

export function sampleOrthogonalAxes(excludeAxes: string[] = []): string[] {
  return ORTHOGONAL_CLUSTERS.map(cluster => {
    const available = cluster.filter(axis => !excludeAxes.includes(axis));
    const pool = available.length > 0 ? available : cluster;
    return pool[Math.floor(Math.random() * pool.length)];
  });
}

const transcriptFrom = (turns: ConversationTurn[]) => turns
  .filter(turn => turn.role === 'user' && turn.content.trim())
  .map(turn => turn.content.trim())
  .join('\n')
  .slice(-6000);

export const exploreRole = {
  create(turns: ConversationTurn[], excludeAxes?: string[] | ExploreGroup): GeminiRoleRequest<{ transcript: string; group?: ExploreGroup }> | null {
    const transcript = transcriptFrom(turns);
    if (!transcript) return null;
    const excluded = Array.isArray(excludeAxes) ? excludeAxes : [];
    const targetAxes = sampleOrthogonalAxes(excluded);
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
      context: { transcript, group: undefined },
      payload: {
        model: FLASH_LITE_MODEL,
        contents: [{ role: 'user', parts: [{ text: `以下只包含使用者在這次對話親口說過的話：\n${transcript}\n\n使用者主動點選了「換個角度」。
請嚴格針對以下指定抽出的 ${targetAxes.length} 條【互斥正交認知軸度】，各自生成 1 個視角卡（剛好 ${targetAxes.length} 張卡，每張卡的 id 必須嚴格對應）：
${instructions}

【核心文風禁令】：
- 嚴禁同義反覆：三張卡的推理機制完全獨立，分別對應其指定軸度。
- 嚴禁憑空腦補：絕對不可捏造使用者沒提及的領域（如工作、效率、壓力、家庭等）。只根據使用者說出的內容延伸。
- 嚴禁文學比喻與散文修辭：嚴禁法庭、審判、黑夜、鐘聲等虛構比喻。請一律用口語、真誠的大白話。
- 嚴禁心理學標籤與教訓：禁止使用「你其實」、「這顯示」、「心理防衛」等說教口氣。繁體中文。` }] }],
        generationConfig: { temperature: 0.35, maxOutputTokens: 550, responseMimeType: 'application/json', responseSchema, thinkingConfig: FAST_THINKING_CONFIG }
      }
    };
  },

  read(raw: string, transcript: string, _group?: ExploreGroup): ExplorePerspective[] | null {
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
    return valid.length >= 3 && valid.length <= 4
      && new Set(valid.map(card => card.id)).size === valid.length
      && new Set(normalized).size === valid.length
      ? valid
      : null;
  }
};
