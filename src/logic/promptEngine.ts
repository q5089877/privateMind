/**
 * 思緒停靠（Mind Harbor）V7.2 — 本機 Prompt Engine & 通用思考入口庫
 *
 * 核心原則：
 * - 本機運算，不傳送資料至雲端
 * - 提示不是答案、不是診斷、不是建議
 * - 每次提供 3 個不同思考維度的開放入口
 * - 支援「換一組」與近期去重
 */

export interface PromptItem {
  id: string;
  category: 'deconstruct' | 'concretize' | 'shift_perspective' | 'distance' | 'focus' | 'forward' | 'allow_unknown';
  categoryLabel: string;
  text: string;
}

export const PROMPT_LIBRARY: PromptItem[] = [
  // 【拆開】
  { id: 'dec_1', category: 'deconstruct', categoryLabel: '拆開', text: '把這件事拆成兩件不同的事。' },
  { id: 'dec_2', category: 'deconstruct', categoryLabel: '拆開', text: '把事實和猜測分開。' },
  { id: 'dec_3', category: 'deconstruct', categoryLabel: '拆開', text: '把「全部」縮小成一個具體例子。' },

  // 【具體化】
  { id: 'con_1', category: 'concretize', categoryLabel: '具體化', text: '找一個最近真的發生的例子。' },
  { id: 'con_2', category: 'concretize', categoryLabel: '具體化', text: '把它縮成一個具體瞬間。' },
  { id: 'con_3', category: 'concretize', categoryLabel: '具體化', text: '把模糊的地方換成具體描述。' },

  // 【換角度】
  { id: 'shift_1', category: 'shift_perspective', categoryLabel: '換角度', text: '如果換一個角度看……' },
  { id: 'shift_2', category: 'shift_perspective', categoryLabel: '換角度', text: '想一個不同的可能。' },
  { id: 'shift_3', category: 'shift_perspective', categoryLabel: '換角度', text: '試著替另一個人說一次。' },

  // 【拉開距離】
  { id: 'dist_1', category: 'distance', categoryLabel: '拉開距離', text: '如果今天先不做決定……' },
  { id: 'dist_2', category: 'distance', categoryLabel: '拉開距離', text: '過幾天再回頭看……' },
  { id: 'dist_3', category: 'distance', categoryLabel: '拉開距離', text: '如果這不是你的事，而是別人的事……' },

  // 【聚焦】
  { id: 'foc_1', category: 'focus', categoryLabel: '聚焦', text: '只留下現在最重要的一件事。' },
  { id: 'foc_2', category: 'focus', categoryLabel: '聚焦', text: '如果只能保留一個問題……' },
  { id: 'foc_3', category: 'focus', categoryLabel: '聚焦', text: '把背景先拿掉，只看眼前這一點。' },

  // 【往前】
  { id: 'fwd_1', category: 'forward', categoryLabel: '往前', text: '如果現在只往前一點……' },
  { id: 'fwd_2', category: 'forward', categoryLabel: '往前', text: '找一個不用把整件事做完的下一步。' },
  { id: 'fwd_3', category: 'forward', categoryLabel: '往前', text: '把事情縮小到現在能做的程度。' },

  // 【允許不知道】
  { id: 'unk_1', category: 'allow_unknown', categoryLabel: '允許不知道', text: '也許現在還不用想清楚。' },
  { id: 'unk_2', category: 'allow_unknown', categoryLabel: '允許不知道', text: '我現在還不知道的是……' },
  { id: 'unk_3', category: 'allow_unknown', categoryLabel: '允許不知道', text: '先讓這件事待一下。' }
];

/**
 * 隨機打亂陣列
 */
const shuffleArray = <T>(array: T[]): T[] => {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

/**
 * 本機提示生成引擎：抽取 3 個來自不同思考維度的提示，並進行近期去重
 */
export const generatePrompts = (
  contentContext?: string,
  recentPromptIds: string[] = []
): PromptItem[] => {
  // 分類分群
  const categories = Array.from(new Set(PROMPT_LIBRARY.map(p => p.category)));
  const shuffledCategories = shuffleArray(categories);

  // 優先選擇 3 個不同分類
  const selectedCategories = shuffledCategories.slice(0, 3);
  const selectedPrompts: PromptItem[] = [];

  for (const cat of selectedCategories) {
    const candidates = PROMPT_LIBRARY.filter(p => p.category === cat);
    // 去除近期看過的提示
    const freshCandidates = candidates.filter(p => !recentPromptIds.includes(p.id));
    const pool = freshCandidates.length > 0 ? freshCandidates : candidates;
    const picked = pool[Math.floor(Math.random() * pool.length)];
    if (picked) {
      selectedPrompts.push(picked);
    }
  }

  // 若不足 3 個，補足不同 prompt
  if (selectedPrompts.length < 3) {
    const remaining = PROMPT_LIBRARY.filter(p => !selectedPrompts.some(s => s.id === p.id));
    const extra = shuffleArray(remaining).slice(0, 3 - selectedPrompts.length);
    selectedPrompts.push(...extra);
  }

  return selectedPrompts;
};
