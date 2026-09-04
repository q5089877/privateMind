/**
 * 思緒停靠（Mind Harbor）2.0 — 核心 UI 官方文案庫
 * 產品架構準則詳見 docs/CORE_ARCHITECTURE.md
 */

export const UI_TEXT = {
  home: {
    brandTitle: '思緒停靠',
    brandSubtitle: 'MIND HARBOR',
    inputPlaceholder: '腦中最先浮出來的那一句……',
    submitBtn: '留下這句',
    // Level 0: 消波微震（純生理出口）
    pulseWords: ['停', '先別想', '呼', '可以', '隨它'] as const,
    pulseHint: '想說的話，再點這裡。',
    // Level 1: 四態情境草稿膠囊
    quickDrafts: [
      { id: 'busy', label: '腦袋太吵', text: '好多念頭同時衝進來，不知道先顧哪一個，停不下來。' },
      { id: 'feeling', label: '心裡很悶', text: '剛剛發生了一件事，說不上來是什麼感覺，但心裡很堵。' },
      { id: 'stuck', label: '事情卡住', text: '手上有件事卡在兩個選擇之間，完全不知道該怎麼走下一步。' },
      { id: 'keep', label: '先留著', text: '有個念頭我怕之後忘記，想先原封不動留在這裡。' }
    ] as const,
    reviewPast: '再次相遇',
    backup: '資料管理'
  },
  landing: {
    tag: '暫時停在這裡',
    title: '今天先收在這裡。',
    subtitle: '這不是結論；只是把今晚該想的到此打住。',
    receiptTitle: '心智封裝憑證',
    receiptSub: 'MENTAL CONTAINMENT',
    takeawayHeader: '這次先帶走',
    unresolvedHeader: '留在明天看',
    resumeAnchorPrefix: '下次若要接著談，可以從「',
    resumeAnchorSuffix: '」開始，不擴大戰線。',
    saveBtn: '封存並回到現在',
    backBtn: '還想再說一點',
    persistNote: '選擇回到現在後，這份邊界封存才會和本次對話一起保存。'
  },
  layout: {
    supportBtn: '需要找人聊聊？',
    modal: {
      title: '如果現在需要有人陪你聊聊',
      subtitle: '如果現在已經很難自己撐著，可以找專業的人聊聊。',
      closeBtn: '關閉',
      resources: [
        { name: '衛福部安心專線', desc: '24小時心理諮詢與陪伴', number: '1925' },
        { name: '生命線協談專線', desc: '24小時專人傾聽與協談', number: '1995' },
        { name: '張老師專線', desc: '青少年與各年齡層心靈支持', number: '1980' }
      ]
    }
  }
};

export const CORE_PHILOSOPHY = {
  motto: '說出來 → 看一看 → 收回來 → 放下去。',
  containmentMotto: '物理現實明早 09:00 前不收件，今晚在床上運算一律判定為無效。',
  principles: [
    'Level 0 消波：急性混亂時，先給身體出口，不必面對文字。',
    'Level 1 草稿：低摩擦膠囊，降低啟動阻抗。',
    '客觀手術刀：切開客觀張力與物理邊界，嚴禁心理診斷與套話。',
    '心智封裝：指認今晚運算無效的外部變數，履約下班。',
    '原文第一：每一次留下的原文永久保存，AI 不覆蓋、不篡改。'
  ]
};
