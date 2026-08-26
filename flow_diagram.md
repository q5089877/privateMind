```mermaid
flowchart TD
    %% 進入點
    Start(("啟動")) --> HOME["HOME\n「此刻，腦中有什麼？」"]

    %% HOME 選擇
    HOME -- "自由輸入 / 情緒快選" --> RECEIVE["【接住】"]
    HOME -- "我現在說不上來" --> UNPOKEN["無文字事件\n(短暫安靜)"]
    HOME -- "重新遇見" --> REVIEW["REVIEW\n(重新遇見歷史念頭)"]

    RECEIVE --> SHUNTTING["SHUNTTING\n「你想怎麼對待它？」"]

    %% SHUNTTING 只有二選一
    SHUNTTING -- "先放著" --> DEPOSIT_END["安放沉降\n(好，先放在這裡。)"]
    SHUNTTING -- "帶走一小步" --> ACTION_PATH["ACTION_PATH\n「如果只往前一點，你想怎麼做？」\n(自由文字輸入)"]
    ACTION_PATH -- "送出" --> ACTION_END["行動定格\n(記下了。)"]

    %% 停靠完成態（動能歸零）
    UNPOKEN --> COMPLETED["COMPLETED\n【停靠完成】\n介面動能歸零"]
    DEPOSIT_END --> COMPLETED
    ACTION_END --> COMPLETED

    %% 停靠後出口
    COMPLETED -. "回來看看" .-> REVIEW
    COMPLETED -. "返回首頁 / 離開" .-> HOME

    %% 重新遇見 (REVIEW) 與卡片互動模組
    REVIEW --> TCARD["ThoughtCard\n(念頭卡片)"]
    
    %% 卡片支線操作
    TCARD -- "＋ 後來又想到……" --> ADDITION_REVIEW["AdditionForm\n(線性時間軌跡，不覆寫)"]
    ADDITION_REVIEW --> REVIEW
    
    TCARD -- "重新處理 (Re-process)" --> REPROCESS["重新輸入微步驟\n(保存歷史歷程 revisions)"]
    REPROCESS --> REVIEW
    
    TCARD -- "再看看 (Deepening Tool)" --> DEEPEN["可選深化支線\n① 看看我現在的感受\n② 看看我對感受的反應\n(獨立支線，不綁架主出口)"]
    DEEPEN --> REVIEW

    TCARD -- "🍃 放下 (Release)" --> RELEASE_STATE["原地鬆手標記\n「放下了。」"]
    TCARD -- "🗑️ 刪除 (Delete)" --> DELETE_STATE(("本機永久刪除"))

    %% 樣式定義
    classDef state fill:#FFFFFF,stroke:#E0E0E0,stroke-width:1px,color:#424242;
    classDef ending fill:#EFEEEB,stroke:#D1D1CB,stroke-width:1px,color:#424242;
    
    class HOME,RECEIVE,SHUNTTING,ACTION_PATH,REVIEW,ADDITION_REVIEW,TCARD,REPROCESS,DEEPEN state;
    class COMPLETED,DEPOSIT_END,ACTION_END,UNPOKEN,RELEASE_STATE,DELETE_STATE ending;
```
