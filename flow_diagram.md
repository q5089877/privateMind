# 思緒停靠流程圖（目前實作版）

> 原則：先保存，再顯示；UI 只發出意圖；Flow Engine 協調 AI 與資料；IndexedDB 是本機真實來源。

## 一、總流程

```text
開啟 App
   │
   ▼
HarborFlowEngine.initialise()
   │
   ├─ IndexedDB 讀取／正規化成功 ─────────────┐
   └─ 讀取失敗 → fallback 至 localStorage／memory │
                                                  ▼
                                           HYDRATED → HOME
```

## 二、HOME：留下與定錨

```text
HOME
 │
 ├─ 背景查詢 getTemporalCandidate()
 │    └─ 條件：已超過 48h、未刪除／封存／抑制、尚未驗證
 │          └─ 有候選 → 顯示「尚未整理的念頭」
 │                ├─ 還在 → temporalValidation: still
 │                ├─ 淡掉了 → temporalValidation: faded
 │                └─ 結案 → temporalValidation: resolved
 │
 ├─ 輸入文字 → Flow.submitText()
 │    │
 │    ├─ 空白 → 不動作
 │    └─ 有內容
 │          ▼
 │       先寫入 IndexedDB：Moment
 │          ▼
 │       MOMENT_DOCKED → 留在 HOME，顯示原文停靠卡
 │          ├─ 順著這句往下寫 → CHAT
 │          ├─ 封裝存檔 → LAND 草稿
 │          └─ 結束這次停靠 → 清除暫存卡，不刪除 Moment
 │
 └─ 右上角定錨
      ├─ 短按 → AnchorEvent: tap
      └─ 長按超過門檻 → 水位／心跳震動 → 放開
           └─ AnchorEvent: hold（含 durationMs）
```

## 三、CHAT：續談與換角度

```text
CHAT
 │
 ├─ 首次進入：建立記憶體中的 HarborSession 草稿
 │
 ├─ 使用者輸入後續文字
 │    └─ 原文先與 Session 原子寫入 IndexedDB
 │          ▼
 │       SESSION_CONTINUED
 │          ▼
 │       Present Companion（可選）
 │          ├─ 只讀當次 Moment + 當次 session 前文
 │          ├─ 成功 → 儲存 assistant turn
 │          └─ 失敗／逾時 → 保留原文，使用安全 fallback
 │
 ├─ [換個角度]
 │    └─ Explore Router → 單一 Explore Group
 │          └─ Explore Companion → 一次四張角度卡
 │                （不自動存成使用者資料）
 │
 └─ [今天先到這裡] → LAND
```

## 四、LAND：暫時收束

```text
LAND
 │
 ├─ Landing Companion 只讀本次 session 的使用者 turn
 │    └─ 產生 closure 草稿；失敗則使用安全 fallback
 │
 ├─ [還想再說一點] → 回 CHAT
 │
 └─ [封存並回到現在]
      │
      ▼
   commitClosure() 原子寫入
      ├─ Session.status → landed
      ├─ 保存 SessionClosure
      ├─ Moment.lifecycle → sealed
      └─ 回 HOME
```

## 五、REVIEW：主動回看

```text
HOME → REVIEW
 │
 ├─ 讀取 Moments／Sessions
 │
 ├─ Pattern Passive Mirroring
 │    │
 │    ├─ 確定性門檻：
 │    │    ├─ 至少 3 筆有效 Moment
 │    │    ├─ 時間跨度 7～30 天
 │    │    ├─ 證據跨至少 24 小時
 │    │    └─ 每筆原文超過 15 字
 │    │
 │    ├─ 未達門檻 → 完全不顯示
 │    └─ 達門檻 → AI 只選原文 ID
 │                  └─ UI 並排顯示原文與時間，不顯示 AI 洞見
 │
 └─ 時間流
      ├─ 單筆 Moment → 顯示原文與時間
      └─ Session → 顯示對話與收束
           ├─ 可重新開啟 → CHAT
           ├─ 可暫時封存 → 保留 Pattern 池
           └─ 可刪除 → 從一般回看與 Pattern 隱藏
```

## 六、BACKUP：完整匯出與合併匯入

```text
HOME → BACKUP
 │
 ├─ 匯出
 │    └─ 匯出完整 JSON：
 │         Moment／Session／Turn／Closure／AnchorEvent
 │         舊版 line／linkDecision／temporalState
 │
 └─ 匯入
      ├─ 解析格式與資料
      ├─ 與既有本機資料合併（既有 ID 優先）
      ├─ 保留較長的 temporal cooldown 與較新的評估時間
      ├─ 寫回 IndexedDB
      └─ 失敗 → 回到 idle，顯示錯誤，不會卡在「還原中」
```

## 七、三層時間管線

```text
新 Moment
   ├─ Present Router    → 只處理現在與本次 session
   ├─ Continuity       → 只處理 48 小時後的明確狀態確認
   └─ Pattern Router    → 只在 Review 主動開啟且門檻通過時讀取長期原文

三條管線彼此平行，不互斥；任何一條失敗都不能阻止原文保存。
```
