export const UI_TEXT = {
  settings: {
    title: '歡迎來到思緒停靠',
    subtitle: '',
    disclaimerTitle: '',
    disclaimerP1: '',
    disclaimerP2: '',
    disclaimerHighlight: '',
    disclaimerP3: '',
    disclaimerP4: '',
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
      '單純覺得好累',
      '有點亂糟糟的',
      '突然想到一件事'
    ],
    sayNothing: '我現在說不上來',
    reviewPast: '回望',
    submit: '繼續'
  },
  shunt: {
    title: '現在，你想怎麼對待它？',
    deposit: {
      label: '先安放',
      desc: '現在不用處理它。'
    },
    action: {
      label: '帶走一小步',
      desc: '只做現在做得到的一步。'
    }
  },
  action: {
    contextPrefix: '關於「',
    contextSuffix: '」',
    title: '這一步，你想怎麼做？',
    reselectIntent: '← 重新選擇',
    whatNext: '現在能做哪一步？',
    whatNextPlaceholder: '找出現在做得到的一步……',
    tweakLabel: '還可以再調整',
    dispositions: {
      SELF: {
        label: '我自己來',
        options: ['現在處理', '找個時間', '再退一步']
      },
      TOGETHER: {
        label: '需要他人',
        options: ['記下要找誰', '想想需要什麼幫忙', '先寫一句想說的話']
      },
      CANNOT_NOW: {
        label: '現在還沒辦法',
        options: ['先安放', '等時機成熟', '再退一步']
      },
      NOT_PROCESS: {
        label: '不打算處理',
        options: ['就放下', '放著讓它消失']
      }
    },
    placeholders: {
      schedule: '什麼時候？',
      assignee: '你想找誰？',
      howToHelp: '希望對方怎麼幫你？',
      draftContent: '先寫一句想說的話……',
      waitCondition: '在等什麼？'
    },
    quickTimeOptions: ['今天稍晚', '明天', '這週末', '下週'],
    buttons: {
      backToDeposit: '先安放就好',
      confirm: '記下了'
    }
  },
  completion: {
    ceremony: {
      awareness: '看見了。',
      action: '記下了。',
      cannotDo: '先放在這裡。',
      drop: '放下了。'
    },
    retention: {
      permanent: '已保留',
      awarenessOnly: '只留下這次覺察',
      daysPrefix: '保留 ',
      daysSuffix: ' 天'
    },
    backHome: '返回'
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
      pastSteps: '',
      assigneePrefix: '找 ',
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
    promptAction: '要不要往前一點？',
    optionDeposit: '先放著',
    optionAction: '做一小步',
    actionPlaceholder: '現在能做的一小步是？',
    howToDoPrompt: '怎麼做？',
    saveBtn: '完成',
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
