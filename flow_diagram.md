# 思緒停靠 V7.1 完整流程圖

### 一、文字流程架構

```text
【思緒停靠 V7.1】
                               │
                               ▼
                 ┌───────────────────────────┐
                 │ 自動 Focus 輸入框 / 喚起鍵盤 │
                 ├───────────────────────────┤
                 │    「現在腦中有什麼？」    │
                 └─────────────┬─────────────┘
                               │
                ┌──────────────┴──────────────┐
                │                             │
             自由輸入                      情緒快選
        （念頭 / 感受 / 行動）          生氣/委屈/焦慮/難過...
                │                             │
                └──────────────┬──────────────┘
                               ▼
                             [送出]
                               │
                               ▼
                     文字離開輸入框 → 輕輕落下
                               │
                               ▼
                         【已停靠。】
                               │
                 ┌─────────────┴─────────────┐
                 │                           │
             到這裡就好                  ＋ 接著說……
                 │                           │
                 ▼                           ▼
             安靜離開                    再落下一筆
                                             │
                                             ▼
                                         【已停靠。】


---

回來以後（瀏覽與儀式流）

首頁
 │
 └──► 回來看看
          │
          ▼
       時間線
    ┌─────┴───────────────────┐
    │                         │
    ▼                         ▼
【正在這裡的】             【已封存的】
    │                         │
    ├── ＋ 接著說             ├── ↥ 帶回來（慢慢浮回）
    │                         │
    ├── 🍃 封存（慢慢沉下去）  └── 更多 (⋯) → 刪除
    │
    └── 更多 (⋯) → 刪除
              │
              ▼
         確認刪除頁
         ┌────┴────┐
         │         │
        取消     永久刪除
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
    HOME -->|"回來看看"| TIMELINE["時間線<br/>(正在這裡的 / 已封存的)"]:::input

    %% 寫入路徑
    SUBMIT -->|"Create Thread + Entry"| SETTLED["定格<br/>【已停靠。】"]:::settle
    SETTLED -->|"到這裡就好"| HOME
    SETTLED -->|"＋ 接著說……"| APPEND_NOW["再落下一筆"]:::action
    APPEND_NOW -->|"Append Entry"| SETTLED

    %% 正在這裡的 Thread
    TIMELINE --> ACTIVE_THREAD["正在這裡的 Thread"]:::input
    ACTIVE_THREAD -->|"＋ 接著說……"| APPEND_LATER["追加時間節點"]:::action
    ACTIVE_THREAD -->|"向下拖曳 / 點擊封存"| ARCHIVE_ACTION["慢慢沉下去<br/>【已封存。】"]:::action
    ARCHIVE_ACTION -->|"移出主要視線"| HOME

    %% 已封存的 Thread
    TIMELINE --> ARCHIVED_THREAD["已封存的 Thread"]:::input
    ARCHIVED_THREAD -->|"↥ 帶回來"| RESTORE_ACTION["慢慢浮回<br/>【已回來。】"]:::settle
    RESTORE_ACTION -->|"回到主要時間線"| ACTIVE_THREAD

    %% 獨立刪除流
    ACTIVE_THREAD -->|"更多 (⋯) → 刪除"| DEL_MODAL["確認刪除頁"]:::terminal
    ARCHIVED_THREAD -->|"更多 (⋯) → 刪除"| DEL_MODAL
    DEL_MODAL -->|"永久刪除"| HARD_DEL["本機永久抹除"]:::terminal
    DEL_MODAL -->|"取消"| TIMELINE
```
