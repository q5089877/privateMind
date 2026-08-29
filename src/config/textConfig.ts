/**
 * 思緒停靠（Mind Harbor）V7.2 — UI 官方文案庫
 */

export const UI_TEXT = {
  // 【首頁】
  home: {
    title: '現在腦中有什麼？',
    inputPlaceholder: '寫下來就好……',
    submit: '送出',
    reviewPast: '回來看看',
    quickOptions: [
      '生氣',
      '委屈',
      '焦慮',
      '難過',
      '害怕',
      '開心',
      '說不上來'
    ]
  },

  // 【停靠後】
  completion: {
    ceremony: {
      deposit: '已停靠。',
      unspoken: '已停靠。'
    },
    exits: {
      backHome: '到這裡就好',
      addAddition: '＋ 接著說……'
    }
  },

  // 【時間線與封存區】
  review: {
    title: '時間線',
    subtitle: '時間保留變化，現在指向行動。',
    archivedTitle: '已封存',
    emptyState: '還沒有留下任何痕跡',
    emptyArchivedState: '目前沒有已封存的思緒',
    tabActive: '時間線',
    tabArchived: '已封存',
    toastArchived: '已封存',
    toastUndo: '復原',
    toastRestored: '已回來。',
    card: {
      currentActionHeader: '現在',
      currentActionTitle: '當前行動',
      pastTimelineHeader: '過去',
      addAdditionBtn: '＋ 接著說……',
      takeStepBtn: '帶走一小步',
      actionPrompt: '寫下現在做得到的一步……',
      directSetAction: '直接設為當前行動',
      writeSmallerStep: '寫下一個更小步驟',
      updateAction: '更換當前行動',
      clearActionBtn: '清除',
      archiveBtn: '封存',
      restoreBtn: '還原',
      moreBtn: '⋯',
      confirmDeleteTitle: '確定要刪除這段紀錄嗎？',
      confirmDeleteSubtext: '刪除後無法復原。',
      keepBtn: '取消',
      deleteBtn: '永久刪除'
    }
  },

  // 【接著說……】
  addition: {
    inputPlaceholder: '接著說……',
    saveBtn: '送出',
    cancelBtn: '取消'
  },

  // 【AI／提示引擎】
  promptEngine: {
    triggerBtn: '陪我想想',
    lowPresenceBtn: '想再看一眼？',
    header: '可以從這裡開始：',
    footer: '也可以不選，直接繼續寫。',
    refresh: '換一組',
    close: '收起提示'
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

export const CORE_PRINCIPLES = [
  '你的話留下來；系統不替你解釋你的話。',
  '時間線保存過去，當前行動指出現在。',
  '封存不是刪除；刪除才是真正消失。',
  'AI 不需要理解你，才能幫你開始思考。',
  '讓手勢表達空間關係，讓文字只說必要的事。'
];
