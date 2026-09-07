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
    sectionTitle: '現在想留下什麼？',
    inputHintDefault: '先留下一句也可以。',
    inputHintDraft: '文字可直接修改，或留下一句就好。',
    heroTitle: '把卡在心裡的事，\n先說出來。',
    heroSubtitle: '不用整理，也不用現在就有答案。先從最想說的那一句開始。',
    vignetteTopText: '現在這一刻，是安靜的',
    vignetteBottomText: '「允許每一種狀態存在，也是給自己的寬容。」',
    submittingBtn: '正在安放……',
    settledBtn: '已安放',
    dockedCard: {
      statusIndicator: '已安放',
      continueLink: '順著這句往下寫',
      exploreLink: '換個角度看看'
    },
    counterListening: '準備傾聽',
    counterSuffixInjected: '字已注入',
    vaultSubtext: '存於本機',
    privacyGuarantee: '內容先保存在這台裝置；使用 AI 時，當次文字會經安全連線處理。',
    // Level 0: ⚓🤍 全螢幕沉降注水定心錨（生理心跳與物理定錨共存）
    vent: {
      buttonLabel: '定錨',
      idleHint: '按住',
      holdingState: '隨心跳沉澱',
      sustainedState: '已定錨 · 維持呼吸',
      sustainedSubtext: '保持呼吸 · 放開即止',
      buttonTitle: '輕點消波，按住隨心跳定錨',
      counterPrefix: '已定錨',
      counterSuffix: '次 · 想說再留',
      pulseWords: ['停', '穩', '呼', '放', '隨它'] as const,
      description: '全螢幕沉降注水定心錨：按住時深邃潮水自螢幕底端湧升，伴隨平靜穩定的生理心跳律動（~60 BPM），滿載 100% 物理咬合定錨，持續維持共振直到放開。'
    },
    pulseWords: ['停', '穩', '呼', '放', '隨它'] as const,
    pulseHint: '想說再留。',
    // Level 1: 四態情境草稿膠囊
    quickDrafts: [
      { id: 'busy', label: '腦袋太吵', text: '好多念頭同時衝進來，不知道先顧哪一個，停不下來。' },
      { id: 'feeling', label: '心裡很悶', text: '說不上來是什麼感覺，但整個心裡很堵、很沉。' },
      { id: 'stuck', label: '事情卡住', text: '手上有件事懸在那裡，完全不知道下一步該怎麼走。' },
      { id: 'keep', label: '先留著', text: '有個念頭我怕之後忘記，想先原封不動留在這裡。' },
      // HOME 只保留四個低摩擦入口，不把它做成分類選單。
    ] as const,
    reviewPast: '回看以前留下的事',
    footerPromise: '原文保存在這台裝置；只有使用 AI 功能時，必要內容才會經安全連線處理。',
    backup: '內容只保存在這台裝置'
  },
  chat: {
    backBtn: '回首頁',
    sceneTag: '正在看這件事',
    heroTitle: '我們先從這裡看。',
    heroSubtitle: '不用一次想完；先把眼前卡住的地方說清一點。',
    pastAnchorHeader: '上次先停在這裡',
    userTurnLabel: '你剛才說',
    aiMirrorLabel: '當時的映照',
    loadingHint: '正在沉澱整理這句話…',
    errorHint: 'AI暫時無回應',
    retryBtn: '再試一次',
    continueBtn: '＋ 接著說……',
    concludeBtn: '今天先到這裡',
    exploreBtn: '換個角度',
    closeExploreBtn: '收起',
    composerTitle: '還想補充什麼？',
    composerPlaceholderDefault: '把剛才還沒說完的，接下來……',
    composerPlaceholderGuide: '從這個視角，接續寫下……',
    composerCancelBtn: '先這樣',
    composerSubmitBtn: '接續留下',
    exploreLoading: '正在看另一個角度…',
    exploreEmpty: '暫無其他視角，也可以直接接著說。',
    explorePerspectivePrefix: '另一個角度',
    exploreNextBtn: '再換一個',
    exploreFollowUpPrefix: '接續思考：',
    exploreAdoptBtn: '從這裡接著寫'
  },
  orthogonalAxes: {
    fact: '事實',
    time: '時間',
    control: '控制',
    defusion: '解離',
    need: '需求',
    body: '身體',
    context: '情境',
    exception: '例外',
    other: '他者',
    scale: '尺度',
    assumption: '假設',
    action: '行動'
  } as const,
  landing: {
    tag: '暫時停在這裡',
    title: '今天先收在這裡。',
    subtitle: '這不是結論；只是把現在能想的到此打住。',
    receiptTitle: '思緒邊界',
    receiptSub: 'ANCHOR BOX',
    takeawayHeader: '這次先帶走',
    unresolvedHeader: '留在明天看',
    resumeAnchorPrefix: '下次若要接續，可以從「',
    resumeAnchorSuffix: '」開始，不擴大戰線。',
    saveBtn: '安放並回到現在',
    backToChatBtn: '回到對話',
    backBtn: '還想再多寫一點',
    persistNote: '選擇回到現在後，這份邊界紀錄才會和本次對話一起保存。'
  },
  review: {
    backBtn: '回首頁',
    backupBtn: '資料與備份',
    tag: '回看',
    heroTitle: '你留下的樣子',
    heroSubtitle: '想路過哪裡，就停一下。',
    emptyTimeline: '還沒有留下任何事。',
    // Feed item
    continueBtnLabel: '繼續這裡',
    settleBtn: '安放',
    unsettleBtn: '取消安放',
    deleteBtn: '刪除',
    deleteWarning: '刪除後這筆記錄會從所有地方消失（備份檔仍保留）。確定刪除？',
    deletePatternWarning: '這筆記錄目前是跨時間比對的一部分，刪除後那組連結會消失。確定刪除？',
    // Pattern Passive Mirroring — 平常 100% 隱形，條件符合才浮現
    patternHint: '這幾件事，好像在碰同一個地方。',
    patternLoading: '正在比對原文…',
    patternCollapseBtn: '收起',
    patternDateLabel: (date: string) => date  // 直接顯示日期，不加任何詮釋前綴
  },
  // 舊的 patternInsights 已廢棄（對應舊 Spillover Engine）
  // 現以 review.patternMirror 系列取代
  patternInsights: {
    sectionTitle: '跨時間與情境的線索',
    eventTrackTitle: '事件脈絡重現',
    eventTrackPrefix: '關於這件事：',
    stateTrackTitle: '今日狀態溢出',
    stateSpilloverNotice: '今天的煩躁，好像跟著你跑了好幾個地方。',
    metaPatternTitle: '長期模式重現',
    metaPatternNotice: '有些日子，你的煩躁似乎容易從一個情境延續到另一個情境。',
    exploreGuideQuestion: '要不要看看，今天是不是有什麼東西一直沒鬆下來？',
    adoptLinkBtn: '收下這條線索',
    dismissLinkBtn: '先不管它'
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
  passiveLinkageMotto: '平常不打擾，看到連結才開口。',
  sanctuaryMotto: '和紙自然、老松墨綠、靜謐切片、低刺激性、安穩停靠。',
  principles: [
    'Level 0 消波：急性混亂時，先給身體出口，不必面對文字。',
    'Level 1 草稿：低摩擦膠囊，降低啟動阻抗。',
    '微溫停靠：句號取代問號，純陳述不索取。觸碰暫停的自然淡出，零清理債務。',
    '客觀手術刀：切開客觀張力與物理邊界，嚴禁心理診斷與套話。',
    '雙軌解耦：事件軌道（人事地）與狀態軌道（身心感受）分離，捕捉跨情境溢出與跨時間重現。',
    '心智封裝：指認今晚運算無效的外部變數，履約下班。',
    '原文第一：每一次留下的原文永久保存，AI 不覆蓋、不篡改。',
    '侘寂心智庇護所：採和紙暖白底色與深林老松墨綠，以晨光禪石與晨霧松林切片建立視覺退火點，降低焦慮防備。',
    '44pt 無障礙與人體工學：全系統按鈕嚴格保證 44x44pt 拇指熱區，文字嚴格遵守 WCAG AA 高對比標準。'
  ]
};
