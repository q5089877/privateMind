# 思緒停靠 V7 完整流程架構

### 一、整體 UI 心智模型

```text
                         思緒停靠
                             │
                             ▼
                  「現在腦中有什麼？」
                             │
                             ▼
                          寫下來
                             │
                             ▼
                       「已停靠。」
                             │
                  ┌──────────┴──────────┐
                  ▼                     ▼
             到這裡就好             ＋ 接著說……
                  │                     │
                  ▼                     ▼
                 首頁                新 Entry
                                        │
                                        ▼
                                    時間線累積
                                        │
                                        ├──── ＋ 接著說……
                                        │
                                        ├──── 帶走一小步
                                        │          │
                                        │          ▼
                                        │       當前行動
                                        │
                                        └──── 向下拖曳
                                                   │
                                                   ▼
                                                 封存
                                                   │
                                                   ▼
                                                封存區
                                                   │
                                                   ▼
                                                 還原
                                                   │
                                                   ▼
                                                 時間線


                    刪除
                      │
                      ▼
                  二度確認
                      │
                      ▼
                  永久抹除
```

---

### 二、Mermaid 狀態與動作流

```mermaid
flowchart TD
    %% 節點樣式
    classDef input fill:#F5F5F7,stroke:#D1D1D6,stroke-width:1px,color:#1D1D1F;
    classDef action fill:#E5E5EA,stroke:#8E8E93,stroke-width:1px,color:#1D1D1F;
    classDef settle fill:#34C759,stroke:#248A3D,stroke-width:1px,color:#FFFFFF;
    classDef terminal fill:#8E8E93,stroke:#636366,stroke-width:1px,color:#FFFFFF;

    HOME["首頁<br/>『現在腦中有什麼？』<br/>(自動 Focus + 鍵盤開啟)"]:::input

    %% 首頁操作
    HOME -->|"自由輸入 / 情緒快選"| SUBMIT["送出 (落下)"]:::action
    HOME -->|"回來看看"| TIMELINE["時間線<br/>(時間線 / 封存)"]:::input

    %% 寫入路徑
    SUBMIT -->|"Create Thread + Entry"| SETTLED["定格<br/>【已停靠。】"]:::settle
    SETTLED -->|"到這裡就好"| HOME
    SETTLED -->|"＋ 接著說……"| APPEND_NOW["新 Entry (不覆寫)"]:::action
    APPEND_NOW -->|"Append Entry"| SETTLED

    %% 時間線操作
    TIMELINE --> ACTIVE_THREAD["時間線 Thread"]:::input
    ACTIVE_THREAD -->|"＋ 接著說……"| APPEND_LATER["追加時間節點"]:::action
    ACTIVE_THREAD -->|"帶走一小步"| STEP_ACTION["寫下一小步 / 設為當前行動"]:::action
    STEP_ACTION -->|"置頂顯示"| CURRENT_ACTION["當前行動<br/>(只呈現現在方向)"]:::settle
    ACTIVE_THREAD -->|"向下拖曳 / 封存"| ARCHIVE_ACTION["卡片沉降<br/>【已封存 · 復原】"]:::action
    ARCHIVE_ACTION -->|"離開主要時間線"| TIMELINE

    %% 封存區
    TIMELINE --> ARCHIVED_VIEW["已封存的思緒"]:::input
    ARCHIVED_VIEW -->|"還原"| RESTORE_ACTION["浮回主要時間線"]:::settle
    RESTORE_ACTION --> ACTIVE_THREAD

    %% 獨立刪除流
    ACTIVE_THREAD -->|"更多 (⋯) → 刪除"| DEL_MODAL["二度確認對話框"]:::terminal
    ARCHIVED_VIEW -->|"更多 (⋯) → 刪除"| DEL_MODAL
    DEL_MODAL -->|"刪除"| HARD_DEL["從此裝置移除無法復原"]:::terminal
    DEL_MODAL -->|"取消"| TIMELINE
```
