# 思緒停靠 v6 完整流程圖

### 一、文字流程架構

```text
【思緒停靠 v6】
                               │
                               ▼
                  ┌─────────────────────┐
                  │ 現在腦中有什麼？    │
                  └─────────────────────┘
                               │
                 ┌─────────────┴─────────────┐
                 │                           │
              自由輸入                    情緒快選
                 │                           │
                 └─────────────┬─────────────┘
                               ▼
                             送出
                               │
                               ▼
                         【已停靠。】
                               │
                 ┌─────────────┴─────────────┐
                 │                           │
             到這裡就好                  ＋ 接著說……
                 │                           │
                 ▼                           ▼
             安靜離開                    追加一筆
                                             │
                                             ▼
                                          【已停靠。】


---

回來以後

首頁
 │
 └── 回來看看
          │
          ▼
      時間線
          │
          ▼
       Thread
          │
          ├── 8/27
          │    爸媽年紀越來越大了。
          │
          ├── 8/29
          │    好像真的應該多陪他們吃飯。
          │
          └── 9/03
               昨天陪爸媽吃飯，突然覺得
               其實我只是害怕有一天來不及。
          │
          ▼
 ┌────────────┬──────────────┐
 │            │              │
 ▼            ▼              ▼
＋接著說    🍃先放這裡     🗑刪除
 │            │              │
 ▼            ▼              ▼
追加        離開畫面       刪除紀錄
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

    HOME["首頁<br/>『現在腦中有什麼？』"]:::input

    %% 首頁操作
    HOME -->|"自由輸入 / 情緒快選"| SUBMIT["送出"]:::action
    HOME -->|"回來看看"| TIMELINE["時間線<br/>(歷史 Threads)"]:::input

    %% 寫入路徑
    SUBMIT -->|"追加一筆"| SETTLED["定格<br/>【已停靠。】"]:::settle
    SETTLED -->|"到這裡就好"| HOME
    SETTLED -->|"＋ 接著說……"| APPEND_NOW["輸入補充內容"]:::action
    APPEND_NOW -->|"追加一筆"| SETTLED

    %% 時間線操作
    TIMELINE --> THREAD["檢視 Thread"]:::input
    
    THREAD -->|"＋ 接著說……"| APPEND_LATER["追加時間節點"]:::action
    APPEND_LATER -->|"寫入 Thread"| TIMELINE
    
    THREAD -->|"🍃 先放這裡"| HOME
    THREAD -->|"🗑 刪除"| DELETE["本機移除紀錄"]:::terminal
```
