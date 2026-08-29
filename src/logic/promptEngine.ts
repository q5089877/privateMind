/**
 * 思緒停靠（Mind Harbor）V7.2 — 本機 Prompt Engine & 3 焦距起手式思考庫
 *
 * 核心原則：
 * - 本機運算，零外部網路依賴，保證系統 100% 離線可用與穩定
 * - 嚴格遵循 V7.2 三固定焦距：【近｜特寫鏡頭】、【中｜撥開旁人】、【遠｜縮小放大】
 * - 嚴格禁令：以『……』結尾，絕不含問號『？』，無說教、無心理診斷、無雞湯
 * - 依序固定輸出 3 個焦距的起手式
 */

export type FocalLength = 'near' | 'mid' | 'far';

export interface PromptItem {
  id: string;
  focal: FocalLength;
  focalLabel: string;
  text: string;
}

interface FocalSlotDefinition {
  focal: FocalLength;
  focalLabel: string;
  stems: string[];
}

/**
 * V7.2 定案規格三焦距起手式靜態資料庫
 */
const FOCAL_STEM_DATABASE: Record<FocalLength, FocalSlotDefinition> = {
  // 【近｜特寫鏡頭】聚焦具體瞬間、動作、一句話、身體感受或摩擦點。
  near: {
    focal: 'near',
    focalLabel: '近｜特寫鏡頭',
    stems: [
      '最讓我不舒服的，其實是……',
      '如果只看剛才發生的那一瞬間……',
      '挑出最讓我在意的那一句話……',
      '如果把模糊的感覺換成具體的一幕……',
      '剛剛最刺痛我的那一個細節……',
      '如果只看現在卡住的這個摩擦點……',
      '把事實和猜測分開，眼前發生的是……',
      '如果只看今天最真實的一個感受……',
      '當下身體最直接的反應是……',
      '如果把這件事縮小到最核心的一點……'
    ]
  },

  // 【中｜撥開旁人】拿掉別人的期待、外界規則與他人反應，回到使用者自己的位置。
  mid: {
    focal: 'mid',
    focalLabel: '中｜撥開旁人',
    stems: [
      '如果不去管別人怎麼想，我其實……',
      '拿掉這件事的規則，我最想要的是……',
      '把別人的期待先放一邊，我自己……',
      '如果不需要向任何人交代……',
      '拋開「應該怎樣」，我現在真實的想法是……',
      '如果沒有人會評價或看著我……',
      '把別人的情緒還給對方，留給我的只有……',
      '如果完全依照自己的節奏……',
      '拿掉所有外界的標籤與要求……',
      '如果不勉強自己去符合別人的標準……'
    ]
  },

  // 【遠｜縮小放大】拉開時間跨度、縮小範圍、只看眼前一小段、允許暫時無解或不處理。
  far: {
    focal: 'far',
    focalLabel: '遠｜縮小放大',
    stems: [
      '如果只看眼前這一小段，我想……',
      '如果不急著想答案，我現在真正擔心的是……',
      '先讓這件事在旁邊待一下，現在……',
      '如果允許這件事暫時沒有結論……',
      '今天先不做決定，只留下一點……',
      '如果把時間拉長到半年後再看……',
      '允許自己現在還說不上來……',
      '這件事可以先停在這裡，因為……',
      '如果只縮小到今天能負荷的範圍……',
      '暫時放過自己，先安放……'
    ]
  }
};

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
 * 本機提示生成引擎：
 * 嚴格按照【近鏡頭 $\rightarrow$ 中鏡頭 $\rightarrow$ 遠鏡頭】各取 1 句，組裝成 3 句起手式
 */
export const generatePrompts = (
  _contentContext?: string,
  recentTexts: string[] = []
): PromptItem[] => {
  const order: FocalLength[] = ['near', 'mid', 'far'];
  const selectedPrompts: PromptItem[] = [];

  for (const focal of order) {
    const slot = FOCAL_STEM_DATABASE[focal];
    const availableStems = slot.stems.filter(text => !recentTexts.includes(text));
    const pool = availableStems.length > 0 ? availableStems : slot.stems;
    const shuffled = shuffleArray(pool);
    const chosenText = shuffled[0];

    if (chosenText) {
      selectedPrompts.push({
        id: `${focal}_${Math.random().toString(36).substring(2, 7)}`,
        focal,
        focalLabel: slot.focalLabel,
        text: chosenText
      });
    }
  }

  return selectedPrompts;
};

