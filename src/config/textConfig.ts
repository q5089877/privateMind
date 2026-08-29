/**
 * 思緒停靠（Mind Harbor）V7.2 — UI 官方文案庫
 * 01～19 已定案規格專用
 */

export const UI_TEXT = {
  // 【01｜首頁輸入與「停靠」】
  home: {
    title: '現在腦中有什麼？',
    inputPlaceholder: '寫下此刻想留下的任何一句話……',
    submit: '停靠',
    reviewPast: '回來看看',
    quickOptions: [
      '今天有點累',
      '有件事讓我在意',
      '今天有件事很開心',
      '突然想到一件事'
    ],
    // 【08｜「我現在說不上來」】
    sayNothing: '我現在說不上來',
    sayNothingAck: '看見了。',
    sayNothingSettle: '先放在這裡。'
  },

  // 【03｜停靠完成狀態】
  completion: {
    ceremony: {
      deposit: '已安放。',
      unspoken: '已安放。'
    },
    exits: {
      addAddition: '＋ 接著說……',
      backHome: '到這裡就好'
    }
  },

  // 【07｜回來看看 & 06, 12, 13｜Thread】
  review: {
    backBtn: '←',
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
      tuckAwayBtn: '收起來',
      tuckedAway: '已收起',
      bringBackBtn: '放回眼前',
      makeItVanishBtn: '讓它消失',
      confirmVanishTitle: '確認不再讓這筆內容留在這裡？',
      confirmVanishSubtext: '此動作將永久移除。',
      cancelBtn: '取消'
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
    loading: '思考入口生成中……',
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
  motto: '腦中的事，不一定現在就要想清楚。',
  principles: [
    '你可以寫。',
    '可以停靠。',
    '可以什麼都不做。',
    '可以接著說。',
    '沒想法時，可以叫 AI 給你幾個入口。',
    'AI 只給入口，不替你走。',
    '內容可以一直留著。',
    '不想看了，可以收起來。',
    '真的不要了，才讓它消失。',
    '即使說不上來，也算一次完整的停靠。'
  ]
};
