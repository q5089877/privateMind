# 思緒停靠（Mind Harbor）V7.2 完整流程架構

### 一、整體 UI 心智模型

```text
【主流程】

                    開啟 App
                        │
                        ▼
          「現在腦中有什麼？」
                        │
                        ▼
              輸入框立即 Focus
              手機鍵盤自動開啟
                        │
                        ▼
             輸入任何想留下的話
                        │
                        ▼
                       送出
                        │
                        ▼
          內容落下 → 「已停靠。」
                        │
               ┌────────┴────────┐
               ▼                 ▼
          到這裡就好         ＋ 接著說……
               │                 │
               ▼                 ▼
             回首頁          新增 Entry
                                   │
                                   ▼
                              再次停靠


【AI／提示引擎：可選支線】

使用者已經寫下內容
        │
        ▼
     【已停靠】
        │
        └── 使用者主動選擇「陪我想想」
                         │
                         ▼
                 ┌────────────────┐
                 │ AI／提示引擎   │
                 └───────┬────────┘
                         │
             第一版優先：本機處理
                         │
                         ▼
             本機文字特徵／規則引擎
                         │
                         ▼
                通用思考入口庫
                         │
                         ▼
                顯示 3 個提示
                         │
               ┌─────────┼─────────┐
               ▼         ▼         ▼
             提示 A     提示 B     提示 C
               │         │         │
               └─────────┼─────────┘
                         │
             ┌───────────┴───────────┐
             ▼                       ▼
        使用者選一個               換一組
             │                       │
             ▼                       ▼
         帶回輸入框            重新顯示 3 個提示
             │
             ▼
        使用者自己修改／補充
             │
             ▼
            送出
             │
             ▼
         新增 Entry
             │
             ▼
         再次停靠


【回來看看】

首頁
  │
  ▼
回來看看
  │
  ▼
時間線
  │
  ▼
選擇 Thread
  │
  ▼
查看歷史 Entry
  │
  ├───────────────＋ 接著說…… → 新增 Entry
  │
  ├───────────────帶走一小步 → 當前行動
  │
  └───────────────封存（⋯ 選單） → 移入封存區


【當前行動】

歷史 Entry
     │
     ▼
帶走一小步
     │
     ├─ 原文字已經足夠具體 ──→ 直接設為當前行動
     │
     └─ 原文字不夠具體 ───→ 寫下一個更小步驟 ──→ 當前行動


【封存／還原／刪除】

主要時間線
     │
     ▼
⋯ 選單 → 封存
     │
     ▼
封存區
     │
     ├──────────────↩ 還原 ──→ 原本時間線
     │
     └──────────────🗑 刪除 → 二度確認 → 永久刪除
```

---

### 二、Mermaid 狀態與動作流

```mermaid
flowchart TD
    %% 節點樣式
    classDef input fill:#F5F5F7,stroke:#D1D1D6,stroke-width:1px,color:#1D1D1F;
    classDef action fill:#E5E5EA,stroke:#8E8E93,stroke-width:1px,color:#1D1D1F;
    classDef settle fill:#34C759,stroke:#248A3D,stroke-width:1px,color:#FFFFFF;
    classDef prompt fill:#EBF1EC,stroke:#2E3D33,stroke-width:1px,color:#1D1D1F;
    classDef terminal fill:#8E8E93,stroke:#636366,stroke-width:1px,color:#FFFFFF;

    HOME["首頁<br/>『現在腦中有什麼？』<br/>(自動 Focus + 鍵盤開啟)"]:::input

    %% 首頁操作
    HOME -->|"自由輸入 / 情緒快選"| SUBMIT["送出 (落下)"]:::action
    HOME -->|"回來看看"| TIMELINE["時間線<br/>[時間線] [封存]"]:::input

    %% 寫入路徑
    SUBMIT -->|"Create Thread + Entry"| SETTLED["定格<br/>【已停靠。】"]:::settle
    SETTLED -->|"到這裡就好"| HOME
    SETTLED -->|"＋ 接著說……"| APPEND_NOW["新 Entry (不覆寫)"]:::action
    APPEND_NOW -->|"Append Entry"| SETTLED

    %% AI / 提示引擎支線
    SETTLED -->|"主動選擇『陪我想想』"| PROMPT_ENGINE["本機 Prompt Engine<br/>3 個開放思考提示"]:::prompt
    PROMPT_ENGINE -->|"點選提示"| APPEND_NOW
    PROMPT_ENGINE -->|"換一組"| PROMPT_ENGINE

    %% 時間線操作
    TIMELINE --> ACTIVE_THREAD["主要時間線 (去卡片化純文字流)"]:::input
    ACTIVE_THREAD -->|"＋ 接著說……"| APPEND_LATER["追加時間節點"]:::action
    ACTIVE_THREAD -->|"⋯ → ◎ 帶走一小步"| STEP_ACTION["寫下一小步 / 設為當前行動"]:::action
    STEP_ACTION -->|"置頂顯示"| CURRENT_ACTION["現在往這裡<br/>(唯一當前方向)"]:::settle
    ACTIVE_THREAD -->|"⋯ → ⌸ 封存"| ARCHIVE_ACTION["卡片沉降<br/>【已封存 · 復原】"]:::action
    ARCHIVE_ACTION -->|"離開主要時間線"| TIMELINE

    %% 封存區
    TIMELINE --> ARCHIVED_VIEW["已封存的思緒 (冷靜夾)"]:::input
    ARCHIVED_VIEW -->|"還原"| RESTORE_ACTION["浮回主要時間線"]:::settle
    RESTORE_ACTION --> ACTIVE_THREAD

    %% 嚴格刪除流：先封存才能刪除
    ARCHIVED_VIEW -->|"刪除"| DEL_MODAL["二度確認對話框"]:::terminal
    DEL_MODAL -->|"確認刪除"| HARD_DEL["從此裝置永久抹除"]:::terminal
    DEL_MODAL -->|"取消"| ARCHIVED_VIEW
```
