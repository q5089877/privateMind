# Mind Harbor 核心架構準則

> 說出來 → 看一看 → 收回來 → 放下去。  
> 時間留下痕跡；下次回來，不必重新開始。

本文件是思緒停靠的產品與程式共同準則。任何新功能、AI prompt、資料欄位或 UI 改動，都必須先符合這份準則；若現有程式與本文衝突，應以本文為目標修正，而不是延續舊行為。

思緒停靠不是待辦工具、筆記分類器或心理治療產品。它讓人留下還沒有答案的事，在有需要時透過對話與時間回看多看清一點，最後允許事情暫時沒有結論。

## 一、產品循環

### 1. 留下

首頁只有一個低摩擦入口。使用者不必選主題、命名、分類或決定這是不是某件事的後續。

每一次輸入都先成為獨立的 `Moment`：它保存使用者的原文與時間，永遠不被 AI 改寫、摘要覆蓋或移動到別的位置。

### 2. 展開

一個 Moment 會開始一個 `HarborSession`。如果使用者想繼續說，新的使用者回合與 AI 回應都保留在同一個 session 裡，形成可見的 `ConversationTurn` 對話。

AI 可以理解、提問、換角度與陪談，但不能假裝知道使用者沒有說過的背景，也不能把推測說成原因或結論。

### 3. 收束

「停靠」不是一個送出按鈕，而是暫時安定下來的結果。使用者選擇「今天先到這裡」後，系統才請 AI 為這次對話產生一份 `SessionClosure` 草稿：

- 這次先帶走的一點。
- 還可以先放著、今天不必回答的地方。
- 下次若想回來，可從哪個使用者原話接續。

收束一定先讓使用者看見；只有選擇「回到現在」後才寫入資料。使用者永遠可以選擇「還想說一點」回到原對話。收束是暫時的，不是診斷、任務或結案。

### 4. 回看

回看頁以「一次停靠」為單位排列時間流。每張卡保留起點、對話與收束；同一段 session 不能被拆成多個無意義的片段群組。

跨時間洞見只能在使用者主動開啟時出現，且必須有足夠的時間跨度與原文證據。洞見只指出可驗證的變化、重複、缺口或尚未釐清的拉扯，不替使用者決定那代表什麼。

### 5. 再散落

回看或收束後，系統不建立待辦、不催促追蹤、不要求結案。下一次回到首頁，使用者仍可從任何一個新的念頭開始。

## 二、分層責任

### 1. 介面層 UI

UI 有五個主要場景：

- `HOME`：留下 Moment。
- `CHAT`：顯示本次 session，提供續談與換角度。
- `LAND`：顯示暫時收束草稿，讓使用者回到現在或繼續說。
- `REVIEW`：以時間流回看 session 與跨時間關係。
- `BACKUP`：顯示本機保存、匯出、匯入與未來同步狀態。

UI 只負責呈現狀態與發出使用者意圖。它不得直接讀寫資料庫、呼叫 Gemini、決定 Moment 關係，或在元件內藏商業規則。

### 2. 流程控制層

`HarborFlowEngine` 是唯一的協調入口。它接收 UI 意圖、執行保存與非同步服務、透過 reducer 更新不可變狀態，再通知 UI 呈現。

`FlowState` 只處理畫面狀態，例如 `HOME`、`PRESENT_SETTLED`、`REVIEW`、`PARALLEL`、`DISCOVERY`、`BACKUP`；它不能取代資料模型或承擔 AI 判斷。

session 的開始、續談與收束是獨立責任。目前可由 `HarborFlowEngine` 內的 session 方法承擔；當探索對話、重開 session 或多裝置同步增加複雜度時，必須抽成 `HarborSessionEngine`，而不是繼續把規則堆進 UI。

### 3. 核心資料模型

- `Moment`：不可變的使用者原文、時間與輸入意圖。
- `HarborSession`：由一個 Moment 開始的一次停靠對話。
- `ConversationTurn`：session 中的使用者或 AI 回合。
- `SessionClosure`：使用者確認後保存的暫時收束；包含其引用的使用者 turn id。
- `ThreadLine`：使用者確認或手動建立的跨 Moment 關係；它是連線，不是資料夾。
- `LinkCandidate`、`LinkDecision`：安靜的關聯候選與確認／拒絕／延後紀錄。

一個 Moment 可以同時在總時間流與多條 ThreadLine 中出現。連線永遠不搬移、合併或改寫原文。

### 4. AI 服務層

AI 依任務分角色，而不是由 UI 任意拼 prompt：

- `Present Companion`：只讀取當前 Moment，回應當下。
- `Explore Companion`：只讀取使用者明確打開的當次 session，協助探索與換角度。
- `Landing Companion`：只讀取本次 session 的使用者 turn；AI 自己先前的話不能當成收束證據。
- `Memory Retriever`：只有使用者主動要求時，才在符合跨日門檻的歷史中尋找候選原文。
- `Timeline Reader`：只讀取使用者已確認或手動建立的 ThreadLine，產生附原文日期的跨時間洞見。

每個角色都必須有明確的 prompt 規則與 `Response Validator`。Validator 必須驗證引用是否真的存在、時間門檻是否符合、回覆是否超出長度，以及是否出現診斷、命令、無依據因果或不允許的語言。

### 5. 保存、備份與同步層

`MindHarborRepository` 是唯一資料入口。Moment、session、turn、closure、line 與 decision 的寫入都必須經過它，並盡可能採原子寫入。

- `IndexedDB` 是目前的本機真實來源。
- `Migration` 負責把舊版本資料安全升級為目前結構。
- `Backup Export` 匯出完整 JSON，不可只匯出 Moment。
- `Backup Import` 必須先驗證格式再合併，不可覆蓋既有本機資料。
- `Backup Status` 清楚表達本機保存、最後匯出、最後匯入與待備份變更。
- 加密雲端同步是未來可選能力，不得破壞 local-first、原文主權與可攜備份原則。

### 6. 後端與安全

`GeminiProxyClient` 處理逾時、重試、正規化與錯誤降級；它不處理 UI 決策。

Cloudflare Worker 只做安全轉送。Gemini API key 只能存在 Worker Secret，不能放入前端原始碼、Vite 環境變數、Git 歷史、備份內容或除錯輸出。

## 三、不可違反的規則

1. 先保存，再顯示「已留下」。
2. UI 不直接呼叫 AI 或 Repository；所有意圖都經過 Flow Engine。
3. AI 不自動讀取所有歷史，也不在剛寫完時跳出過去模式。
4. AI 回覆不是使用者資料；收束與洞見只能以使用者原文作為事實來源。
5. 洞見必須可回指原文日期與片段；資料不足時應保持安靜。
6. AI 不診斷、不貼人格或情緒標籤、不命令、不替使用者做決定。
7. 拒絕過的關聯必須被記住，不可重複打擾。
8. 備份資料必須能完整還原 session、對話、收束、連線與決定。
9. 新功能不可把分類、命名或整理責任推回輸入當下的使用者。

## 四、新功能的開發檢查

新增任何功能前，先回答：

1. 它屬於 UI、Flow、Domain、AI、Data、Infrastructure 或 Quality 的哪一層？
2. 它需要讀取哪些使用者原文？是否取得了當下明確意圖？
3. 它會否改寫原文、改變時間位置、暗示關係或製造待辦壓力？
4. 它的資料如何進入備份、匯入、版本升級與合併？
5. 若 AI 失敗、逾時或沒有可信結果，產品是否仍能安全地保存與離開？
6. 是否有對應的型別檢查、流程測試與 UI 驗證？

## 五、目前實作與下一步

目前已具備：Moment／session／turn／closure／line 資料模型、MVI Flow Engine、IndexedDB 與 JSON 備份、當下回應、使用者原文為依據的收束、可從回看重新開啟同一個 session 的續談、session 時間流、跨時間回看、Cloudflare Worker proxy。

下一步應依序補足：獨立的 Explore Companion、可測試的 Prompt Roles 與 Response Validator 模組、session／備份／洞見門檻的自動化測試，以及最終才是使用者同意下的加密雲端同步。
