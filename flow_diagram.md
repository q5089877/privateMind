# 程式實際流程圖（source-level）

> 本圖依目前 source code 的實際呼叫鏈繪製。節點中的檔案與函式名稱可直接回到程式搜尋。核心原則：畫面只發出事件；HarborFlowEngine 協調狀態、資料與 AI；MindHarborRepository 負責 IndexedDB 寫入。

## 1. App 啟動與畫面分派

```mermaid
flowchart TD
  A["React App render"] --> B["useFlow()"]
  B --> C["useFlowEngine()"]
  C --> D["new HarborFlowEngine()"]
  D --> E["constructor()"]
  E --> F["void initialise()"]
  F --> G["storage.getData()"]
  G -->|成功| H["dispatch(HYDRATED)"]
  G -->|失敗| I["dispatch(SET_REQUEST idle + error)"]
  H --> J["snapshot.ready = true"]
  I --> J
  J --> K{"snapshot.screen"}
  K -->|HOME| L["HomeScreen"]
  K -->|CHAT| M["ChatScreen"]
  K -->|LAND| N["LandingScreen"]
  K -->|REVIEW| O["ReviewScreen"]
  K -->|BACKUP| P["BackupScreen"]
```

App.tsx 只依 flow.state 選畫面，所有畫面 callback 都來自 useFlow.ts。

## 2. HOME 實際輸入流程

```mermaid
flowchart TD
  A["HomeScreen.beginConversation(text)"] --> B["triggerDockedDismiss(true)"]
  B --> C{"evaluateSafetyRisk(text)"}
  C -->|高風險| D["立即 onStartInput(text)"]
  C -->|一般輸入| E["setTimeout 550ms"]
  E --> F["setTimeout 450ms"]
  F --> G["onStartInput(text)"]
  D --> H["useFlow.submitText"]
  G --> H
  H --> I["HarborFlowEngine.submitText(content, intent=captured)"]
  I --> J{"content.trim() 是否為空"}
  J -->|是| K["return，不寫入"]
  J -->|否| L["dispatch SET_REQUEST(saving)"]
  L --> M["建立 Moment(id, content, createdAt, lifecycle=docked)"]
  M --> N["storage.saveMoment(moment)"]
  N --> O["取得 persistenceState"]
  O --> P["dispatch MOMENT_DOCKED"]
  P --> Q["snapshot.dockedMoment 更新"]
  Q --> R["HOME 顯示停靠卡"]
```

停靠卡分支：接著說 → openChat()；封裝存檔 → beginLandingFromMoment()；結束停靠 → dismissDockedMoment()（只清顯示，不刪 Moment）。

右上角定錨：recordAnchorEvent(tap 或 hold, durationMs) → MindHarborRepository.recordAnchorEvent() 寫入 AnchorEvent。

## 3. CHAT 實際流程

```mermaid
flowchart TD
  A["HomeScreen: 接著說"] --> B["HarborFlowEngine.openChat()"]
  B --> C["取 dockedMoment/currentMoment"]
  C --> D["createOrContinueSession(moment)"]
  D --> E["dispatch OPEN_CHAT"]
  E --> F["App render ChatScreen(moment, session)"]
  F --> G["ChatScreen useEffect"]
  G --> H{"moment.immediateReply 存在且非 fallback？"}
  H -->|是| I["顯示已保存 reply"]
  H -->|否| J["首次進入不自動呼叫 Present"]
  K["使用者在 CHAT 輸入"] --> L["ChatScreen.onContinue(text)"]
  L --> M["useFlow.submitText(text, follow_up)"]
  M --> N["createOrContinueSession(moment)"]
  N --> O["storage.saveMomentWithSession(moment, session)"]
  O --> P["dispatch SESSION_CONTINUED"]
  P --> Q["requestPresentReply(moment, session)"]
  Q --> R["CompanionService.replyToPresentMoment"]
  R --> S["GeminiProxyClient.getCompanionResponse"]
  S --> T{"回應有效？"}
  T -->|是| U["saveImmediateReply(moment.id, reply)"]
  T -->|否/逾時| V["保留原文；顯示不可用/安全 fallback"]
  U --> W["appendAssistantTurn"]
  W --> X["storage.saveReplyAndSession"]
  X --> Y["dispatch MOMENT_REPLY_SAVED"]
```

Present 的去重與取消：requestPresentReply() 使用 presentReplyRequests 去重；新的請求先 abort 舊請求；visibilitychange 進入背景也取消中的請求。

## 4. CHAT Explore 實際流程

```mermaid
flowchart TD
  A["ChatScreen: 換個角度"] --> B["requestExploration(session)"]
  B --> C["HarborFlowEngine.requestExploration"]
  C --> D["dispatch SET_REQUEST(thinking)"]
  D --> E["CompanionService.exploreSession"]
  E --> F["GeminiProxyClient.getExplorePerspectives(turns, excludeAxes)"]
  F --> G["exploreRole.sampleOrthogonalAxes"]
  G --> H["三個 cluster 各取一軸"]
  H --> I["產出 3 張 perspectives"]
  I --> J{"AI 結果存在？"}
  J -->|是| K["回傳 ExploreResult"]
  J -->|否| L["localExplore：最後一筆 user turn 產生 3 張 fallback"]
  K --> M["dispatch SET_REQUEST(idle)"]
  L --> M
  M --> N["ChatScreen 顯示目前卡片"]
  N --> O{"到最後一張後按下一個？"}
  O -->|是| P["帶 excludeAxes 再請求一批"]
  O -->|否| Q["只在本機切換 activePerspectiveIndex"]
```

Explore 不寫入 Moment、Session 或 Closure；採用卡片只把 followUp 帶進輸入框。

## 5. LAND 實際流程

```mermaid
flowchart TD
  A["ChatScreen: 今天先到這裡"] --> B["HarborFlowEngine.beginLanding(session)"]
  B --> C["找 currentMoment；找不到則 getMoments()"]
  C --> D["dispatch SET_REQUEST(thinking)"]
  D --> E["CompanionService.closeSession(session)"]
  E --> F["GeminiProxyClient.getSessionClosure(session.turns)"]
  F --> G{"AI closure 有效？"}
  G -->|是| H["toClosure(session, draft)"]
  G -->|否| I["fallbackClosure(session)"]
  H --> J["dispatch LANDING_READY"]
  I --> J
  J --> K["LandingScreen 顯示 closure 草稿"]
  K -->|還想再說| L["dispatch RETURN_TO_CHAT"]
  K -->|封存並回到現在| M["completeLanding(sessionId, closure)"]
  M --> N["storage.getData() 找 persisted 或 current draft session"]
  N --> O["storage.commitClosure(momentId, session, closure)"]
  O --> P["Session=landed + Closure 保存 + Moment=sealed"]
  P --> Q["dispatch SESSION_UPDATED"]
  Q --> R["reset() → HOME"]
```

## 6. REVIEW 實際流程

```mermaid
flowchart TD
  A["HOME: 回看"] --> B["openReview()"]
  B --> C["dispatch SET_SCREEN(REVIEW)"]
  C --> D["ReviewScreen mount"]
  D --> E["reload()"]
  E --> F["Promise.all(getMoments(), getSessions())"]
  F --> G["storage.getData() + sort"]
  D --> H["canShowPatternMirror()"]
  H --> I["PatternService.canMirror(moments)"]
  D --> J["getTemporalCandidate()"]
  J --> K["MindHarborRepository.getTemporalCandidate()"]
  K --> L{">=48h、未驗證、未刪除/結案且 cooldown 通過？"}
  L -->|是| M["顯示 Temporal Delta 卡"]
  L -->|否| N["不顯示"]
  O["使用者點 Pattern"] --> P["requestPatternMirror()"]
  P --> Q["PatternService.findMirror(moments)"]
  Q --> R["AI 只回傳可用 Moment IDs"]
  R --> S["UI 並排顯示原文與時間"]
  M --> T["still / faded / resolved"]
  T --> U["resolveTemporalDelta(momentId, choice)"]
  U --> V["repository.update()"]
  V --> W["寫入 Moment.temporalValidation + temporalState"]
  X["使用者開啟 Session"] --> Y["openSession(sessionId)"]
  Y --> Z["必要時 saveSession(active)"]
  Z --> AA["dispatch SESSION_OPENED → CHAT"]
```

PatternService.canMirror() 先做確定性門檻；AI 只負責選原文 ID，Review UI 不顯示文字推論。

## 7. BACKUP 實際流程

```mermaid
flowchart TD
  A["BACKUP 畫面"] --> B["getBackupOverview()"]
  B --> C["storage.getData()"]
  C --> D["顯示筆數/備份狀態"]
  E["匯出"] --> F["exportBackup()"]
  F --> G["storage.getData()"]
  G --> H["BackupService.createText"]
  H --> I["makeBackupText(data)"]
  I --> J["BackupService.download → Blob + browser download"]
  J --> K["storage.markExported()"]
  L["匯入檔案"] --> M["importBackup(text)"]
  M --> N["dispatch SET_REQUEST(restoring)"]
  N --> O["BackupService.parse"]
  O --> P["parseBackupText"]
  P --> Q{"Schema / version / 欄位驗證通過？"}
  Q -->|否| R["throw；不寫入 IndexedDB"]
  Q -->|是| S["storage.mergeImported(incoming)"]
  S --> T["同 ID 既有資料優先的 merge"]
  T --> U["IndexedDB update"]
  U --> V["dispatch SET_REQUEST(idle)"]
  R --> W["catch → dispatch idle + error"]
```

## 8. 實際資料流總結

```mermaid
flowchart LR
  UI["Screens"] --> Hook["useFlow"]
  Hook --> Engine["HarborFlowEngine"]
  Engine --> Repo["MindHarborRepository"]
  Repo --> IDB["IndexedDB / local persistence"]
  Engine --> Companion["CompanionService"]
  Companion --> Client["GeminiProxyClient"]
  Client --> Roles["presentRole / exploreRole / landing role"]
  Engine --> Pattern["PatternService"]
  Pattern --> Client
  Engine --> Backup["BackupService"]
  Backup --> Parser["backup.ts schema validation"]
  Parser --> Repo
```

目前最容易被誤讀的實際差異：

1. openChat() 本身不呼叫 Present；CHAT 首次顯示依賴 Moment 已有 immediateReply。
2. Explore Router 已不存在；正常 AI 路徑與 fallback 都是三張卡、三個正交軸。
