# 思緒停靠 V7 完整流程圖

### 一、文字流程架構

```text
【思緒停靠 V7】
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
                     Create Thread + Entry
                               │
                               ▼
                         【已停靠。】
                               │
                 ┌─────────────┴─────────────┐
                 │                           │
             到這裡就好                  ＋ 接著說……
                 │                           │
                 ▼                           ▼
             安靜離開                    追加一筆 (念頭/行動)
                                             │
                                             ▼
                                         【已停靠。】


---

回來以後（瀏覽流）

首頁
 │
 └──► 回來看看
          │
          ▼
       時間線
          │
          ▼
      選擇 Thread
          │
          ▼
 ┌──────────────────────────────────────┐
 │                                      │
 │   【當前行動】                        │
 │   唯一有效版本（若有行動意圖）        │
 │                                      │
 └──────────────────────────────────────┘
          │
          ▼
 ──────── 歷史時間線 ────────
          │
          ├── 8/27 念頭：爸媽年紀越來越大了。
          ├── 8/28 行動：明天問朋友有沒有推薦搬家公司。
          └── 8/29 行動：算了，先等等。
          │
          ▼
 ┌────────────┬──────────────┬───────────┐
 │            │              │           │
 ▼            ▼              ▼           ▼
＋接著說    設為當前行動   🍃先放這裡  🗑刪除
 │            │              │           │
 ▼            ▼              ▼           ▼
追加        更新置頂       離開畫面    移除紀錄
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
    HOME -->|"自由輸入 / 情緒快選"| SUBMIT["送出"]:::action
    HOME -->|"回來看看"| TIMELINE["時間線<br/>(歷史 Threads)"]:::input

    %% 寫入路徑
    SUBMIT -->|"Create Thread + Entry"| SETTLED["定格<br/>【已停靠。】"]:::settle
    SETTLED -->|"到這裡就好"| HOME
    SETTLED -->|"＋ 接著說……"| APPEND_NOW["輸入補充內容 (念頭/行動)"]:::action
    APPEND_NOW -->|"Append Entry"| SETTLED

    %% 時間線操作
    TIMELINE --> THREAD["檢視 Thread"]:::input
    
    THREAD -->|"置頂顯示"| CURR_ACTION["【當前行動】<br/>(唯一有效版本)"]:::input
    THREAD -->|"時間流顯示"| HIST_ENTRIES["【歷史時間線】<br/>(不可變歷史)"]:::input
    
    THREAD -->|"＋ 接著說……"| APPEND_LATER["追加節點 (念頭 / 當前行動)"]:::action
    APPEND_LATER -->|"寫入 Thread"| TIMELINE
    
    THREAD -->|"🍃 先放這裡"| HOME
    THREAD -->|"🗑 刪除"| DELETE["本機永久移除紀錄"]:::terminal
```
