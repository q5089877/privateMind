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
    footerPromise: '留下來就好。想接著理清，或停在這裡都可以。',
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
      { id: 'keep', label: '先留著', text: '有個念頭我怕之後忘記，想先原封不動留在這裡。' }
    ] as const,
    reviewPast: '回看以前留下的事',
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
    heroTitle: '事情怎麼走到今天',
    heroSubtitle: '每一次停靠都留在發生的位置。想回看時，從原文與時間裡找值得再看的地方。',
    insightCardTitle: '回看最近留下的事',
    insightCardDesc: '只在你現在主動點選後讀取跨時間原文。它不會建立群組，也不會替你做決定。',
    loadingHint: '正在從時間流與原話裡尋找可驗證的軌跡…',
    triggerBtn: '回看時間軌跡',
    evidenceHeader: '留下的軌跡',
    angleHeader: '看得見的變化',
    unresolvedHeader: '還可再看的地方',
    emptyInsight: '目前還沒有足夠跨時間、可驗證的原文。先讓它們留在時間流裡，之後再回來看看。',
    emptyTimeline: '這裡還沒有留下任何事。',
    statusConcluded: '今天先收在這裡',
    statusPending: '還停在這裡',
    turnCountSuffix: '則對話',
    takeawayHeader: '這次先帶走',
    pendingHint: '這段話還留在這裡；之後若想回來，可以從原本的地方接著說。',
    continueSessionBtn: '＋ 接著說……',
    revisitSessionBtn: '回到這次停靠',
    collapseTurnsBtn: '收起對話',
    expandTurnsPrefix: '展開對話 · ',
    userTurnLabel: '你留下的話',
    aiTurnLabel: '當時的映照'
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
