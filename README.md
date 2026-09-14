# 轉念之間

> **陪你把卡在心裡的事說清一點，再安心地放下。**

轉念之間讓使用者留下當下想法，並從金剛經與道德經的角度重新看一眼。

完整、可約束後續開發的產品與程式準則在 [核心架構準則](docs/CORE_ARCHITECTURE.md)。

## 技術概況

- React、TypeScript、Vite、Tailwind CSS、Framer Motion
- IndexedDB 本機保存；可匯出與匯入完整 JSON 備份
- Cloudflare Worker 或 Vercel Serverless Function 安全轉送 Gemini 請求，API key 只存在後端 Secret

## 🚀 快速開始 (Getting Started)

```bash
npm install
npm run dev
```

## 免費 AI Proxy

若 Cloudflare Worker 的出口位置被 Gemini 判定為不支援地區，可將本專案部署到 Vercel Hobby 作為免費 Proxy：

1. 將 `api/gemini.js` 與 `vercel.json` 一起部署到 Vercel。
2. 在 Vercel Project Settings → Environment Variables 設定 `GEMINI_API_KEY`。
3. 將前端建置環境變數 `VITE_AI_PROXY_URL` 設為 Vercel 的 `/api/gemini` 完整網址。
4. 在 GitHub Repository Settings → Secrets and variables → Actions → Variables 新增 `VITE_AI_PROXY_URL`，值為上述 Vercel endpoint。
5. 不要把 API Key 寫入前端、`.env` 提交檔或 GitHub。

本機直接使用 Vite 時，仍可透過 `CLOUDFLARE_WORKER_URL` 測試；若改用 Vercel 本機開發，請使用 Vercel CLI 的本機代理功能。
