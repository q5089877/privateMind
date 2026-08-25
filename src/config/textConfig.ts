export const UI_TEXT = {
  settings: {
    title: '歡迎來到思緒停靠',
    tagline: '這裡只為當下的念頭留一個位置。',
    taglineSub: '你可以寫下來、先放著，或只留下一次覺察。',
    instruction: '你希望寫下的內容保留多久？',
    options: {
      days7: { label: '保留 7 天', desc: '適合暫時放著的內容' },
      days30: { label: '保留 30 天', desc: '方便之後回望' },
      days90: { label: '保留 90 天', desc: '留給之後的自己' },
      permanent: { label: '永久保留', desc: '想一直留著的內容' },
      awareness: { label: '只留覺察時間', desc: '不保留文字，只記下這次來過' },
    },
    footerNote: '資料只存在你的裝置上。你可以在「回望」中修改個別期限。'
  },
  home: {
    title: '此刻，腦中有什麼？',
    inputPlaceholder: '寫下一點就好……',
    quickOptions: [
      '腦袋一直轉不停',
      '心裡慌慌的',
      '有點亂糟糟的',
      '單純覺得好累'
    ],
    sayNothing: '我現在說不上來',
    reviewPast: '回望',
    submit: '繼續'
  },
  shunt: {
    title: '你想怎麼對待它？',
    deposit: {
      label: '先放著',
      desc: '現在不用處理它。'
    },
    action: {
      label: '帶走一小步',
      desc: '如果只往前一點，只做現在做得到的一步。'
    }
  },
  action: {
    contextPrefix: '關於「',
    contextSuffix: '」',
    title: '如果只往前一點，你想怎麼做？',
    whatNextPlaceholder: '寫下現在做得到的一步……',
    buttons: {
      backToDeposit: '先放著就好',
      confirm: '記下了'
    }
  },
  completion: {
    ceremony: {
      awareness: '看見了。',
      deposit: '看見了。',
      action: '記下了。'
    },
    retention: {
      permanent: '已保留',
      awarenessOnly: '只留下這次覺察',
      daysPrefix: '保留 ',
      daysSuffix: ' 天'
    },
    exits: {
      addAddition: '＋ 後來又想到……',
      reviewPast: '回來看看',
      backHome: '返回首頁'
    }
  },
  review: {
    title: '回望',
    subtitle: '讓暫時不用處理的念頭，離開注意力。',
    emptyState: '還沒有任何內容',
    filters: {
      ALL: '全部',
      ACTION: '行動',
      DEPOSIT: '安放',
      RELEASED: '已放下'
    },
    card: {
      sourcePrefix: '「',
      sourceSuffix: '」',
      awareness: '這是一次無聲的覺察',
      confirmReleaseTitle: '準備好放下這個念頭了嗎？',
      confirmDeleteTitle: '要從裝置上永久刪除這筆紀錄嗎？',
      keepBtn: '取消',
      releaseBtn: '不再處理',
      deleteBtn: '確認刪除',
      releasedSubtitle: '這個念頭曾經來過。',
      retentionPrefix: '保存至 ',
      keepReleasedBtn: '繼續放著'
    }
  },
  addition: {
    addBtn: '＋ 後來又想到……',
    inputPlaceholder: '寫下後來的念頭……',
    promptAction: '你想怎麼對待它？',
    optionDeposit: '先放著',
    optionAction: '帶走一小步',
    actionTitle: '如果只往前一點，你想怎麼做？',
    actionPlaceholder: '寫下現在做得到的一步……',
    saveBtn: '記下了',
    cancelBtn: '取消'
  },
  released: {
    title: '已放下',
    subtitle: '已經決定暫時不處理的念頭，\n留在這裡，不需要回來。',
    emptyState: '目前沒有放下的念頭',
    backBtn: '返回'
  },
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
