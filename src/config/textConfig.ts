/**
 * 思緒停靠（Mind Harbor）V7.2 — UI 官方文案庫
 * 01～19 已定案規格專用
 */

export const UI_TEXT = {
  // 【01｜首頁輸入與「停靠」】
  home: {
    brandTitle: '思緒停靠 · MIND HARBOR',
    title: '留下還沒想完的事。',
    subtitle: '等時間過去，再看自己怎麼走到今天。',
    inputPlaceholder: '想法、情緒，或只是一些說不上來的東西……',
    submit: '放下',
    reviewPast: '再次相遇 →',
    reviewBtn: '再次相遇',
    footerPhilosophy: '寫下來可以停在這裡。要不要往前，由你決定。',
    quickOptions: [
      '腦袋一直轉不停',
      '單純覺得好累',
      '胸口悶悶的',
      '亂糟糟的'
    ],
    // 【08｜「我現在說不上來」】
    sayNothing: '我現在說不上來',
    sayNothingAck: '看見了。',
    sayNothingSettle: '先放在這裡。'
  },

  // 【03｜停靠完成狀態】
  completion: {
    ceremony: {
      deposit: '放在這裡了。',
      unspoken: '放在這裡了。'
    },
    desk: {
      title: '思緒桌面',
      hint: '先看見它們。想換個看法時，再選一個角度。',
      perspectiveBtn: '換個看法',
      resetPerspective: '回到全部',
      perspectiveActive: '正在用這個角度看',
      writingHint: '這只是看法，不是答案。',
      operationHint: '選一個角度；內容不會被改動。'
    },
    exits: {
      addAddition: '＋ 接著說……',
      backHome: '到這裡就好'
    }
  },

  // 【07｜再次相遇 & 06, 12, 13｜Thread】
  review: {
    backBtn: '←',
    backHome: '回首頁',
    emptyState: '還沒有留下任何痕跡',
    today: '今天',
    ineffableText: '說不上來……',
    sandwichEllipsis: '···',
    addAdditionBtn: '＋ 接著說……',
    toastTuckedAway: '已收起',
    toastUndo: '復原',
    toastBroughtBack: '已放回眼前。',
    
    // 【17, 18｜「收起來」語言與操作】
    card: {
      addAdditionBtn: '＋ 接著說……',
      editBtn: '修改',
      copyThreadBtn: '複製這段',
      copiedThread: '已複製這段思緒',
      copyFailed: '暫時無法複製',
      saveEditBtn: '儲存',
      cancelEditBtn: '取消',
      tuckAwayBtn: '收起來',
      tuckedAway: '已收起',
      bringBackBtn: '放回眼前',
      makeItVanishBtn: '讓它消失',
      confirmVanishTitle: '確認不再讓這筆內容留在這裡？',
      confirmVanishSubtext: '此動作將永久移除。',
      cancelBtn: '取消',
      expandSandwich: '···',
      collapseSandwich: '收合思緒'
    }
  },

  // 【18｜已收起空間】
  hiddenSpace: {
    backBtn: '← 回去',
    title: '已收起',
    emptyState: '目前沒有已收起的內容'
  },

  // 【04, 14｜「接著說……」輸入狀態】
  addition: {
    inputPlaceholder: '接著寫……',
    saveBtn: '停靠',
    cancelBtn: '取消'
  },

  // 【02, 05, 14, 15, 16｜AI 入口與提示引擎】
  promptEngine: {
    entryBtn: '沒想法的話，換個角度看看',
    loading: '正在整理幾個可看的角度……',
    offlineNotice: '目前離線中，先留給自己慢慢寫……',
    focalLengths: {
      near: '近｜焦點伸展',
      mid: '中｜抽離期待',
      far: '遠｜尺度放寬'
    }
  },

  // 【19｜「打理」】
  manage: {
    title: '打理',
    languageHeader: '語言',
    languages: {
      zhTW: '繁體中文',
      en: 'English',
      ja: '日本語',
      ko: '한국어'
    }
  },

  // 【全局次要選單 (···)】
  menu: {
    trigger: '···',
    hiddenSpaceItem: '已收起',
    manageItem: '打理'
  },

  // 【緊急求助／專業支持】
  layout: {
    supportBtn: '需要找人聊聊？',
    modal: {
      title: '如果現在需要有人陪你聊聊',
      subtitle: '如果現在已經很難自己撐著，可以找專業的人聊聊。',
      closeBtn: '關閉',
      resources: [
        {
          name: '衛福部安心專線',
          desc: '24小時心理諮詢與陪伴',
          number: '1925'
        },
        {
          name: '生命線協談專線',
          desc: '24小時專人傾聽與協談',
          number: '1995'
        },
        {
          name: '張老師專線',
          desc: '青少年與各年齡層心靈支持',
          number: '1980'
        }
      ]
    }
  }
};

export const CORE_PHILOSOPHY = {
  motto: '留下還沒想完的事；等時間過去，再看自己怎麼走到今天。',
  principles: [
    '你可以寫。',
    '可以停靠。',
    '可以什麼都不做。',
    '可以接著說。',
    '沒想法時，可以換一個角度看。',
    'AI 只提供操作，不替你下結論。',
    '內容可以一直留著。',
    '不想看了，可以收起來。',
    '真的不要了，才讓它消失。',
    '即使說不上來，也算一次完整的停靠。'
  ]
};
