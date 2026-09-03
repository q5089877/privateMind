# 思緒停靠（Mind Harbor）

> **陪你把卡在心裡的事說清一點，再安心地放下。**

思緒停靠讓使用者先留下尚未想完的事；想談時可在同一次停靠中展開對話，準備好時帶走一點暫時收束。時間過去後，使用者也能從原文可驗證的軌跡裡回看自己怎麼走到今天。

完整、可約束後續開發的產品與程式準則在 [核心架構準則](docs/CORE_ARCHITECTURE.md)。

## 技術概況

- React、TypeScript、Vite、Tailwind CSS、Framer Motion
- IndexedDB 本機保存；可匯出與匯入完整 JSON 備份
- Cloudflare Worker 安全轉送 Gemini 請求，API key 只存在 Worker Secret

## 🚀 快速開始 (Getting Started)

```bash
npm install
npm run dev
```
