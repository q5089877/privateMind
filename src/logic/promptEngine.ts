/**
 * 思緒停靠（Mind Harbor）V7.2 — 本機 Prompt Engine & 受控結構插槽思考庫
 *
 * 核心原則：
 * - 本機運算，不傳送資料至雲端
 * - 受控插槽（Controlled Slot Permutation）：擴充至 200+ 種自然組合，杜絕生硬語病
 * - 提示不是答案、不是診斷、不是建議
 * - 每次提供 3 個不同思考維度的開放入口
 * - 支援「換一組」與近期去重
 */

export type PromptCategory = 
  | 'deconstruct' 
  | 'concretize' 
  | 'shift_perspective' 
  | 'distance' 
  | 'focus' 
  | 'forward' 
  | 'allow_unknown';

export interface PromptItem {
  id: string;
  category: PromptCategory;
  categoryLabel: string;
  text: string;
}

interface SlotDefinition {
  category: PromptCategory;
  categoryLabel: string;
  prefixes: string[];
  cores: string[];
  suffixes: string[];
}

const CATEGORY_SLOTS: Record<PromptCategory, SlotDefinition> = {
  // 【拆開】
  deconstruct: {
    category: 'deconstruct',
    categoryLabel: '拆開',
    prefixes: ['', '試著', '如果先'],
    cores: [
      '把事實和猜測分開',
      '把這件事拆成兩件不同的事',
      '把「全部」縮小成一個具體例子',
      '把別人的期待和自己的想法分開'
    ],
    suffixes: ['。', '……', '，會看見什麼？']
  },

  // 【具體化】
  concretize: {
    category: 'concretize',
    categoryLabel: '具體化',
    prefixes: ['', '試著', '如果可以，'],
    cores: [
      '找一個最近真的發生的例子',
      '把它縮成一個具體瞬間',
      '把模糊的感覺換成具體描述',
      '挑出最讓你在意的那一句話'
    ],
    suffixes: ['。', '……', '，是哪一幕？']
  },

  // 【換角度】
  shift_perspective: {
    category: 'shift_perspective',
    categoryLabel: '換角度',
    prefixes: ['', '如果', '試著'],
    cores: [
      '換一個完全不同的角度看',
      '想一個不同的可能',
      '替另一個人說一次這段經歷',
      '想像一年後的自己怎麼看現在'
    ],
    suffixes: ['……', '。', '，會有什麼不同？']
  },

  // 【拉開距離】
  distance: {
    category: 'distance',
    categoryLabel: '拉開距離',
    prefixes: ['', '如果', '先不急著解決，'],
    cores: [
      '今天先不做決定',
      '過幾天再回頭看',
      '把這件事當成別人的事',
      '先讓這件事在旁邊待一下'
    ],
    suffixes: ['。', '……', '，會感覺如何？']
  },

  // 【聚焦】
  focus: {
    category: 'focus',
    categoryLabel: '聚焦',
    prefixes: ['', '如果只能選一個，', '試著'],
    cores: [
      '只留下現在最重要的一件事',
      '把所有背景先拿掉，只看眼前',
      '問自己一個最想問的問題',
      '找出目前最卡住的那一點'
    ],
    suffixes: ['。', '……', '，那會是什麼？']
  },

  // 【往前】
  forward: {
    category: 'forward',
    categoryLabel: '往前',
    prefixes: ['', '如果現在只往前一點，', '試著'],
    cores: [
      '找一個不用把整件事做完的下一步',
      '縮小到現在 5 分鐘內能做的事',
      '做一個隨時可以反悔的小嘗試',
      '把事情縮小到現在能負荷的程度'
    ],
    suffixes: ['。', '……', '，第一步會是什麼？']
  },

  // 【允許不知道】
  allow_unknown: {
    category: 'allow_unknown',
    categoryLabel: '允許不知道',
    prefixes: ['', '也許', '先'],
    cores: [
      '現在還不用想清楚',
      '我現在還不知道的是',
      '允許自己暫時說不上來',
      '先讓這件事安靜地待一下'
    ],
    suffixes: ['。', '……', '。']
  }
};

/**
 * 組合前綴、核心與後綴並去除多餘空格標點
 */
const composePromptText = (prefix: string, core: string, suffix: string): string => {
  let combined = '';
  if (prefix) {
    // 若前綴以逗號結尾或需連接
    combined = `${prefix}${core}${suffix}`;
  } else {
    // 第一個字大寫/首字平順
    combined = `${core}${suffix}`;
  }

  // 清理重複標點符號
  combined = combined.replace(/……[。！？]/g, '……').replace(/[。！？][。！？]/g, '。');
  return combined;
};

/**
 * 預先編譯全量受控插槽題庫（~200+ 組合）
 */
export const COMPILED_PROMPT_LIBRARY: PromptItem[] = (() => {
  const library: PromptItem[] = [];
  const categories = Object.keys(CATEGORY_SLOTS) as PromptCategory[];

  for (const cat of categories) {
    const slot = CATEGORY_SLOTS[cat];
    let idx = 1;
    for (const prefix of slot.prefixes) {
      for (const core of slot.cores) {
        for (const suffix of slot.suffixes) {
          const text = composePromptText(prefix, core, suffix);
          // 確保文字去重
          if (!library.some(item => item.text === text)) {
            library.push({
              id: `${cat}_${idx++}`,
              category: cat,
              categoryLabel: slot.categoryLabel,
              text
            });
          }
        }
      }
    }
  }

  return library;
})();

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
  const categories = Object.keys(CATEGORY_SLOTS) as PromptCategory[];
  const shuffledCategories = shuffleArray(categories);

  // 優先選擇 3 個不同維度
  const selectedCategories = shuffledCategories.slice(0, 3);
  const selectedPrompts: PromptItem[] = [];

  for (const cat of selectedCategories) {
    const candidates = COMPILED_PROMPT_LIBRARY.filter(p => p.category === cat);
    // 去除近期看過的提示
    const freshCandidates = candidates.filter(p => !recentPromptIds.includes(p.id));
    const pool = freshCandidates.length > 0 ? freshCandidates : candidates;
    const picked = pool[Math.floor(Math.random() * pool.length)];
    if (picked) {
      selectedPrompts.push(picked);
    }
  }

  // 若不足 3 個，補足不同維度 prompt
  if (selectedPrompts.length < 3) {
    const remaining = COMPILED_PROMPT_LIBRARY.filter(p => !selectedPrompts.some(s => s.id === p.id));
    const extra = shuffleArray(remaining).slice(0, 3 - selectedPrompts.length);
    selectedPrompts.push(...extra);
  }

  return selectedPrompts;
};
